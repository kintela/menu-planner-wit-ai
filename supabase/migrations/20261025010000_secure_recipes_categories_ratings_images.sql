-- Secure the recipes domain without rewriting existing rows, URLs, associations, or objects.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'::public.user_role
  );
$function$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_recipe(p_recipe_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.recipes AS recipe
    WHERE recipe.id = p_recipe_id
      AND (
        recipe.user_id = auth.uid()
        OR public.current_user_is_admin()
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_manage_recipe(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_recipe(integer) FROM anon;
REVOKE ALL ON FUNCTION public.can_manage_recipe(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_recipe(integer) TO authenticated;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can update recipes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can delete recipes" ON public.recipes;
DROP POLICY IF EXISTS "recipes select managed" ON public.recipes;
DROP POLICY IF EXISTS "recipes insert own" ON public.recipes;
DROP POLICY IF EXISTS "recipes update managed" ON public.recipes;
DROP POLICY IF EXISTS "recipes delete managed" ON public.recipes;

CREATE POLICY "recipes select managed"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

CREATE POLICY "recipes insert own"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "recipes update managed"
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

CREATE POLICY "recipes delete managed"
  ON public.recipes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.recipes FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipes FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.recipes_id_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.recipes_id_seq FROM authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.recipes_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_recipes(p_recipe_id integer DEFAULT NULL)
RETURNS TABLE (
  id integer,
  name text,
  ingredients text,
  preparation text,
  image_url text,
  is_ai_generated boolean,
  created_at timestamptz,
  video_url text,
  source_url text,
  calories integer,
  categories jsonb,
  author_alias text,
  rating_average numeric,
  rating_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    recipe.id,
    recipe.name::text,
    recipe.ingredients,
    recipe.preparation,
    recipe.image_url,
    recipe.is_ai_generated,
    recipe.created_at,
    recipe.video_url,
    recipe.source_url,
    recipe.calories,
    COALESCE(category_data.categories, '[]'::jsonb) AS categories,
    COALESCE(NULLIF(btrim(up.alias), ''), 'Usuario') AS author_alias,
    rating_data.rating_average,
    COALESCE(rating_data.rating_count, 0::bigint) AS rating_count
  FROM public.recipes AS recipe
  LEFT JOIN public.user_profiles AS up ON up.id = recipe.user_id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object('id', category.id, 'name', category.name)
      ORDER BY category.name, category.id
    ) AS categories
    FROM public.recipe_categories AS link
    JOIN public.categories AS category ON category.id = link.category_id
    WHERE link.recipe_id = recipe.id
  ) AS category_data ON true
  LEFT JOIN LATERAL (
    SELECT
      avg(rating.rating)::numeric AS rating_average,
      count(*)::bigint AS rating_count
    FROM public.recipe_ratings AS rating
    WHERE rating.recipe_id = recipe.id
  ) AS rating_data ON true
  WHERE p_recipe_id IS NULL OR recipe.id = p_recipe_id
  ORDER BY recipe.created_at DESC, recipe.id DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_public_recipes(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_recipes(integer) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_recipes(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recipes(integer) TO anon, authenticated;

CREATE TABLE public.category_name_registry (
  normalized_name text PRIMARY KEY
);

INSERT INTO public.category_name_registry (normalized_name)
SELECT DISTINCT lower(btrim(category.name))
FROM public.categories AS category;

REVOKE ALL PRIVILEGES ON TABLE public.category_name_registry FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.category_name_registry FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_category_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  reserved_name text;
BEGIN
  NEW.name := btrim(NEW.name);

  IF NEW.name = '' THEN
    RAISE EXCEPTION 'El nombre de la categoría no puede estar vacío'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE'
     AND lower(btrim(OLD.name)) = lower(NEW.name) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.category_name_registry (normalized_name)
  VALUES (lower(NEW.name))
  ON CONFLICT (normalized_name) DO NOTHING
  RETURNING normalized_name INTO reserved_name;

  IF reserved_name IS NULL THEN
    RAISE EXCEPTION 'Ya existe una categoría con ese nombre'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_category_name() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_category_name() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_category_name() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_category_name_before_write ON public.categories;
CREATE TRIGGER enforce_category_name_before_write
  BEFORE INSERT OR UPDATE OF name ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_category_name();

CREATE OR REPLACE FUNCTION public.release_category_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  old_normalized_name text := lower(btrim(OLD.name));
BEGIN
  IF TG_OP = 'UPDATE'
     AND old_normalized_name = lower(btrim(NEW.name)) THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.category_name_registry AS registry
  WHERE registry.normalized_name = old_normalized_name
    AND NOT EXISTS (
      SELECT 1
      FROM public.categories AS category
      WHERE lower(btrim(category.name)) = old_normalized_name
    );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_category_name() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_category_name() FROM anon;
REVOKE ALL ON FUNCTION public.release_category_name() FROM authenticated;

DROP TRIGGER IF EXISTS release_category_name_after_write ON public.categories;
CREATE TRIGGER release_category_name_after_write
  AFTER UPDATE OF name OR DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.release_category_name();

CREATE OR REPLACE FUNCTION public.guard_category_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.recipe_categories AS link
    WHERE link.category_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'La categoría está asociada a recetas y no se puede eliminar'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_category_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_category_delete() FROM anon;
REVOKE ALL ON FUNCTION public.guard_category_delete() FROM authenticated;

DROP TRIGGER IF EXISTS guard_category_delete_before_delete ON public.categories;
CREATE TRIGGER guard_category_delete_before_delete
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_category_delete();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;
DROP POLICY IF EXISTS "categories select public" ON public.categories;
DROP POLICY IF EXISTS "categories insert authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories update admin" ON public.categories;
DROP POLICY IF EXISTS "categories delete admin" ON public.categories;

CREATE POLICY "categories select public"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "categories insert authenticated"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "categories update admin"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "categories delete admin"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.categories FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.categories FROM authenticated;
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.categories_id_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.categories_id_seq FROM authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.categories_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.merge_categories(
  p_source_category_id integer,
  p_target_category_id integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede fusionar categorías'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_source_category_id IS NULL
     OR p_target_category_id IS NULL
     OR p_source_category_id = p_target_category_id THEN
    RAISE EXCEPTION 'Las categorías de origen y destino deben existir y ser distintas'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM category.id
  FROM public.categories AS category
  WHERE category.id IN (p_source_category_id, p_target_category_id)
  ORDER BY category.id
  FOR UPDATE;

  IF (SELECT count(*)
      FROM public.categories AS category
      WHERE category.id IN (p_source_category_id, p_target_category_id)) <> 2 THEN
    RAISE EXCEPTION 'Las categorías de origen y destino deben existir'
      USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.recipe_categories (recipe_id, category_id)
  SELECT link.recipe_id, p_target_category_id
  FROM public.recipe_categories AS link
  WHERE link.category_id = p_source_category_id
  ON CONFLICT (recipe_id, category_id) DO NOTHING;

  DELETE FROM public.recipe_categories
  WHERE category_id = p_source_category_id;

  DELETE FROM public.categories
  WHERE id = p_source_category_id;

  RETURN p_target_category_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_categories(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merge_categories(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.merge_categories(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.merge_categories(integer, integer) TO authenticated;

ALTER TABLE public.recipe_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view recipe_categories" ON public.recipe_categories;
DROP POLICY IF EXISTS "Authenticated users can insert recipe_categories" ON public.recipe_categories;
DROP POLICY IF EXISTS "Authenticated users can update recipe_categories" ON public.recipe_categories;
DROP POLICY IF EXISTS "Authenticated users can delete recipe_categories" ON public.recipe_categories;
DROP POLICY IF EXISTS "recipe categories select public" ON public.recipe_categories;
DROP POLICY IF EXISTS "recipe categories insert managed" ON public.recipe_categories;
DROP POLICY IF EXISTS "recipe categories update managed" ON public.recipe_categories;
DROP POLICY IF EXISTS "recipe categories delete managed" ON public.recipe_categories;

CREATE POLICY "recipe categories select public"
  ON public.recipe_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "recipe categories insert managed"
  ON public.recipe_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_recipe(recipe_id));

CREATE POLICY "recipe categories update managed"
  ON public.recipe_categories
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_recipe(recipe_id))
  WITH CHECK (public.can_manage_recipe(recipe_id));

CREATE POLICY "recipe categories delete managed"
  ON public.recipe_categories
  FOR DELETE
  TO authenticated
  USING (public.can_manage_recipe(recipe_id));

REVOKE ALL PRIVILEGES ON TABLE public.recipe_categories FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_categories FROM authenticated;
GRANT SELECT ON TABLE public.recipe_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_categories TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_self_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.recipes AS r
    WHERE r.id = NEW.recipe_id
      AND r.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'No se puede valorar una receta propia'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.reject_self_rating() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_self_rating() FROM anon;
REVOKE ALL ON FUNCTION public.reject_self_rating() FROM authenticated;

DROP TRIGGER IF EXISTS reject_self_rating_before_write ON public.recipe_ratings;
CREATE TRIGGER reject_self_rating_before_write
  BEFORE INSERT OR UPDATE OF recipe_id, user_id ON public.recipe_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_self_rating();

ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings select own" ON public.recipe_ratings;
DROP POLICY IF EXISTS "ratings insert own" ON public.recipe_ratings;
DROP POLICY IF EXISTS "ratings update own" ON public.recipe_ratings;
DROP POLICY IF EXISTS "ratings delete own" ON public.recipe_ratings;

CREATE POLICY "ratings select own"
  ON public.recipe_ratings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ratings insert own"
  ON public.recipe_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ratings update own"
  ON public.recipe_ratings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ratings delete own"
  ON public.recipe_ratings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL PRIVILEGES ON TABLE public.recipe_ratings FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_ratings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_ratings TO authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.recipe_ratings_id_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.recipe_ratings_id_seq FROM authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.recipe_ratings_id_seq TO authenticated;

ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_recipe_id_fkey;

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_recipe_id_fkey
  FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE NO ACTION;

CREATE TABLE public.recipe_managed_images (
  recipe_id integer PRIMARY KEY
    REFERENCES public.recipes(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recipe_managed_images_canonical_path_check CHECK (
    object_path ~ '^[1-9][0-9]*/[^/]+$'
    AND split_part(object_path, '/', 1) = recipe_id::text
  )
);

ALTER TABLE public.recipe_managed_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "managed images select" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images insert" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images update" ON public.recipe_managed_images;
DROP POLICY IF EXISTS "managed images delete" ON public.recipe_managed_images;

CREATE POLICY "managed images select"
  ON public.recipe_managed_images
  FOR SELECT
  TO authenticated
  USING (public.can_manage_recipe(recipe_id));

CREATE POLICY "managed images insert"
  ON public.recipe_managed_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_recipe(recipe_id));

CREATE POLICY "managed images update"
  ON public.recipe_managed_images
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_recipe(recipe_id))
  WITH CHECK (public.can_manage_recipe(recipe_id));

CREATE POLICY "managed images delete"
  ON public.recipe_managed_images
  FOR DELETE
  TO authenticated
  USING (public.can_manage_recipe(recipe_id));

REVOKE ALL PRIVILEGES ON TABLE public.recipe_managed_images FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.recipe_managed_images FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipe_managed_images TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = true;

CREATE OR REPLACE FUNCTION public.can_manage_recipe_image_path(p_object_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  recipe_id_text text;
  parsed_recipe_id numeric;
BEGIN
  IF p_object_path IS NULL
     OR p_object_path !~ '^[1-9][0-9]*/[^/]+$' THEN
    RETURN false;
  END IF;

  recipe_id_text := pg_catalog.split_part(p_object_path, '/', 1);
  parsed_recipe_id := recipe_id_text::numeric;

  IF parsed_recipe_id > 2147483647 THEN
    RETURN false;
  END IF;

  RETURN public.can_manage_recipe(parsed_recipe_id::integer);
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.can_manage_recipe_image_path(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_recipe_image_path(text) FROM anon;
REVOKE ALL ON FUNCTION public.can_manage_recipe_image_path(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_recipe_image_path(text) TO authenticated;

DROP POLICY IF EXISTS "recipe images select public" ON storage.objects;
DROP POLICY IF EXISTS "recipe images insert managed" ON storage.objects;
DROP POLICY IF EXISTS "recipe images update managed" ON storage.objects;
DROP POLICY IF EXISTS "recipe images delete managed" ON storage.objects;

CREATE POLICY "recipe images select public"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'recipe-images');

CREATE POLICY "recipe images insert managed"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND public.can_manage_recipe_image_path(name)
  );

CREATE POLICY "recipe images update managed"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_manage_recipe_image_path(name)
  )
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND public.can_manage_recipe_image_path(name)
  );

CREATE POLICY "recipe images delete managed"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_manage_recipe_image_path(name)
  );
