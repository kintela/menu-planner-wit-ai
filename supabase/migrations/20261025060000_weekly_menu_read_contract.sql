-- Authenticated weekly-menu snapshot read, including opaque admin targets.

CREATE OR REPLACE FUNCTION public.get_weekly_menu_snapshot(
  p_start_date date,
  p_target_ref uuid DEFAULT NULL
)
RETURNS TABLE (
  menu_exists boolean,
  is_saved boolean,
  saved_at timestamptz,
  target_ref uuid,
  target_label text,
  day_of_week integer,
  meal_type text,
  dish_order integer,
  recipe_id integer,
  sacado_del_congelador boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
BEGIN
  IF p_start_date IS NULL
     OR extract(isodow FROM p_start_date) <> 1 THEN
    RAISE EXCEPTION 'WM_INVALID_WEEK'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_owner_id := public.resolve_weekly_menu_target(p_target_ref);

  RETURN QUERY
  SELECT
    menu.id IS NOT NULL AS menu_exists,
    COALESCE(menu.is_saved, false) AS is_saved,
    menu.saved_at,
    CASE WHEN p_target_ref IS NOT NULL THEN profile.planner_ref ELSE NULL END AS target_ref,
    CASE WHEN p_target_ref IS NOT NULL THEN
      COALESCE(NULLIF(btrim(profile.alias), ''), 'Usuario')
        || ' · ' || left(replace(profile.planner_ref::text, '-', ''), 8)
      ELSE NULL
    END AS target_label,
    item.day_of_week,
    item.meal_type::text,
    item.dish_order,
    item.recipe_id,
    item.sacado_del_congelador
  FROM (SELECT 1) AS singleton
  LEFT JOIN public.user_profiles AS profile
    ON profile.id = v_owner_id
  LEFT JOIN public.weekly_menus AS menu
    ON menu.user_id = v_owner_id
   AND menu.start_date = p_start_date
  LEFT JOIN public.menu_items AS item
    ON item.weekly_menu_id = menu.id
  ORDER BY item.day_of_week, item.meal_type, item.dish_order;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_weekly_menu_snapshot(date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_menu_snapshot(date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_weekly_menu_snapshot(date, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_menu_snapshot(date, uuid) TO authenticated;
