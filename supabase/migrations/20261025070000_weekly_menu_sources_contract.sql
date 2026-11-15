-- Minimal authenticated source-week list for menu reuse.

CREATE OR REPLACE FUNCTION public.get_weekly_menu_sources(
  p_target_ref uuid DEFAULT NULL
)
RETURNS TABLE (
  start_date date,
  end_date date,
  source_label text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
BEGIN
  v_owner_id := public.resolve_weekly_menu_target(p_target_ref);

  RETURN QUERY
  SELECT
    menu.start_date,
    menu.end_date,
    menu.start_date::text || ' – ' || menu.end_date::text AS source_label
  FROM public.weekly_menus AS menu
  WHERE menu.user_id = v_owner_id
    AND menu.is_saved = true
  ORDER BY menu.start_date DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_weekly_menu_sources(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_menu_sources(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_weekly_menu_sources(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_menu_sources(uuid) TO authenticated;
