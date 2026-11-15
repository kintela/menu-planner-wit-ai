-- Harden recipe image transitions without changing the already-applied migration.

DROP POLICY IF EXISTS "managed images select" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images insert" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images update" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images delete" ON public.recipe_managed_images;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_managed_images FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_managed_images FROM authenticated;

CREATE TABLE public.recipe_image_cleanup_authorizations (
  object_path text PRIMARY KEY,
  recipe_id integer NOT NULL,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_image_cleanup_path_check CHECK (
    object_path ~ '^[1-9][0-9]*/[^/]+$'
    AND split_part(object_path, '/', 1) = recipe_id::text
  )
);

ALTER TABLE public.recipe_image_cleanup_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_image_cleanup_authorizations FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_image_cleanup_authorizations FROM authenticated;

CREATE OR REPLACE FUNCTION public.accredit_recipe_image_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  parsed_recipe_id integer;
BEGIN
  IF NEW.bucket_id <> 'recipe-images'
     OR auth.uid() IS NULL
     OR NEW.name !~ '^[1-9][0-9]*/[^/]+$' THEN
    RETURN NEW;
  END IF;

  parsed_recipe_id := pg_catalog.split_part(NEW.name, '/', 1)::integer;
  IF NOT public.can_manage_recipe(parsed_recipe_id) THEN
    RAISE EXCEPTION 'No se puede acreditar la imagen para esta receta'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.recipe_image_cleanup_authorizations (object_path, recipe_id, actor_id)
  VALUES (NEW.name, parsed_recipe_id, auth.uid())
  ON CONFLICT (object_path) DO UPDATE
  SET recipe_id = EXCLUDED.recipe_id,
      actor_id = EXCLUDED.actor_id,
      created_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.accredit_recipe_image_upload() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accredit_recipe_image_upload() FROM anon;
REVOKE ALL ON FUNCTION public.accredit_recipe_image_upload() FROM authenticated;

DROP TRIGGER IF EXISTS accredit_recipe_image_upload_after_insert ON storage.objects;
CREATE TRIGGER accredit_recipe_image_upload_after_insert
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.accredit_recipe_image_upload();

CREATE OR REPLACE FUNCTION public.associate_recipe_image(
  p_recipe_id integer,
  p_object_path text,
  p_image_url text
)
RETURNS TABLE (active_url text, cleanup_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  previous_path text;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recipe(p_recipe_id) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_object_path IS NULL OR p_object_path !~ '^[1-9][0-9]*/[^/]+$'
     OR pg_catalog.split_part(p_object_path, '/', 1) <> p_recipe_id::text
     OR NULLIF(pg_catalog.btrim(p_image_url), '') IS NULL THEN
    RAISE EXCEPTION 'Ruta o URL de imagen inválida' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'recipe-images' AND object.name = p_object_path
  ) OR NOT EXISTS (
    SELECT 1 FROM public.recipe_image_cleanup_authorizations AS cleanup
    WHERE cleanup.object_path = p_object_path
      AND cleanup.recipe_id = p_recipe_id
      AND cleanup.actor_id = actor
  ) THEN
    RAISE EXCEPTION 'El objeto subido no está acreditado' USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM recipe.id FROM public.recipes AS recipe WHERE recipe.id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receta no encontrada' USING ERRCODE = 'no_data_found'; END IF;

  SELECT managed.object_path INTO previous_path
  FROM public.recipe_managed_images AS managed
  WHERE managed.recipe_id = p_recipe_id
  FOR UPDATE;

  INSERT INTO public.recipe_managed_images (recipe_id, object_path, updated_at)
  VALUES (p_recipe_id, p_object_path, now())
  ON CONFLICT (recipe_id) DO UPDATE
  SET object_path = EXCLUDED.object_path, updated_at = now();

  UPDATE public.recipes SET image_url = p_image_url WHERE id = p_recipe_id;
  DELETE FROM public.recipe_image_cleanup_authorizations WHERE object_path = p_object_path;

  IF previous_path IS NOT NULL AND previous_path <> p_object_path THEN
    INSERT INTO public.recipe_image_cleanup_authorizations (object_path, recipe_id, actor_id)
    VALUES (previous_path, p_recipe_id, actor)
    ON CONFLICT (object_path) DO UPDATE SET actor_id = actor, created_at = now();
  END IF;

  RETURN QUERY SELECT p_image_url, CASE WHEN previous_path <> p_object_path THEN previous_path ELSE NULL END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_recipe_image(p_recipe_id integer)
RETURNS TABLE (active_url text, cleanup_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  previous_path text;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recipe(p_recipe_id) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM recipe.id FROM public.recipes AS recipe WHERE recipe.id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receta no encontrada' USING ERRCODE = 'no_data_found'; END IF;
  DELETE FROM public.recipe_managed_images
  WHERE recipe_id = p_recipe_id
  RETURNING object_path INTO previous_path;
  UPDATE public.recipes SET image_url = NULL WHERE id = p_recipe_id;
  IF previous_path IS NOT NULL THEN
    INSERT INTO public.recipe_image_cleanup_authorizations (object_path, recipe_id, actor_id)
    VALUES (previous_path, p_recipe_id, actor)
    ON CONFLICT (object_path) DO UPDATE SET actor_id = actor, created_at = now();
  END IF;
  RETURN QUERY SELECT NULL::text, previous_path;
END;
$function$;

DROP POLICY IF EXISTS "recipes delete managed" ON public.recipes;
REVOKE DELETE ON TABLE public.recipes FROM authenticated;

CREATE OR REPLACE FUNCTION public.delete_recipe_with_image_cleanup(p_recipe_id integer)
RETURNS TABLE (deleted boolean, cleanup_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid := auth.uid();
  previous_path text;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recipe(p_recipe_id) THEN
    RAISE EXCEPTION 'No autorizado' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM recipe.id FROM public.recipes AS recipe WHERE recipe.id = p_recipe_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receta no encontrada' USING ERRCODE = 'no_data_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.menu_items AS item WHERE item.recipe_id = p_recipe_id) THEN
    RAISE EXCEPTION 'La receta está incluida en un menú' USING ERRCODE = 'foreign_key_violation';
  END IF;
  SELECT managed.object_path INTO previous_path
  FROM public.recipe_managed_images AS managed WHERE managed.recipe_id = p_recipe_id;
  IF previous_path IS NOT NULL THEN
    INSERT INTO public.recipe_image_cleanup_authorizations (object_path, recipe_id, actor_id)
    VALUES (previous_path, p_recipe_id, actor)
    ON CONFLICT (object_path) DO UPDATE SET actor_id = actor, created_at = now();
  END IF;
  DELETE FROM public.recipes WHERE id = p_recipe_id;
  RETURN QUERY SELECT true, previous_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_delete_recipe_image_object(p_object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.recipe_managed_images AS managed
      WHERE managed.object_path = p_object_path
        AND public.can_manage_recipe(managed.recipe_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.recipe_image_cleanup_authorizations AS cleanup
      WHERE cleanup.object_path = p_object_path
        AND cleanup.actor_id = auth.uid()
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.finalize_recipe_image_cleanup(p_object_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.recipe_image_cleanup_authorizations AS cleanup
    WHERE cleanup.object_path = p_object_path AND cleanup.actor_id = actor
  ) THEN
    RAISE EXCEPTION 'Limpieza no autorizada' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'recipe-images' AND object.name = p_object_path
  ) THEN
    DELETE FROM public.recipe_image_cleanup_authorizations
    WHERE object_path = p_object_path AND actor_id = actor;
    RETURN true;
  END IF;
  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.associate_recipe_image(integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_recipe_image(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_recipe_with_image_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_delete_recipe_image_object(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_recipe_image_cleanup(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.associate_recipe_image(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_recipe_image(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_recipe_with_image_cleanup(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_recipe_image_object(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_recipe_image_cleanup(text) TO authenticated;

DROP POLICY IF EXISTS "recipe images delete managed" ON storage.objects;
DROP POLICY IF EXISTS "recipe images delete accredited" ON storage.objects;
CREATE POLICY "recipe images delete accredited"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_delete_recipe_image_object(name)
  );
