-- Make image metadata transitions the only way to change or delete recipe images.

CREATE OR REPLACE FUNCTION public.can_delete_recipe_image_object(p_object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.recipe_image_cleanup_authorizations AS cleanup
    WHERE cleanup.object_path = p_object_path
      AND cleanup.actor_id = auth.uid()
  );
$function$;

REVOKE ALL ON FUNCTION public.can_delete_recipe_image_object(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_recipe_image_object(text) TO authenticated;

DROP POLICY IF EXISTS "recipe images delete accredited" ON storage.objects;
DROP POLICY IF EXISTS "recipe images delete cleanup authorized" ON storage.objects;
CREATE POLICY "recipe images delete cleanup authorized"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND public.can_delete_recipe_image_object(name)
  );

REVOKE ALL PRIVILEGES ON TABLE public.recipes FROM authenticated;
GRANT SELECT ON TABLE public.recipes TO authenticated;
GRANT INSERT (name, ingredients, preparation, is_ai_generated, video_url, source_url, calories, user_id)
  ON TABLE public.recipes TO authenticated;
GRANT UPDATE (name, ingredients, preparation, is_ai_generated, video_url, source_url, calories)
  ON TABLE public.recipes TO authenticated;
