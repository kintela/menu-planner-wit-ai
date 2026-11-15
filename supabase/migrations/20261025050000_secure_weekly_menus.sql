-- Secure weekly menu integrity and writes without rewriting historical menu data.

DO $preconditions$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.weekly_menus AS menu
    GROUP BY menu.user_id, menu.start_date
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_DUPLICATE_WEEK';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.weekly_menus AS menu
    WHERE menu.user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_NULL_OWNER';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items AS item
    WHERE item.weekly_menu_id IS NULL
       OR item.recipe_id IS NULL
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_NULL_ITEM_REFERENCE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.weekly_menus AS menu
    WHERE extract(isodow FROM menu.start_date) <> 1
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_WEEK_NOT_MONDAY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.weekly_menus AS menu
    WHERE menu.end_date <> menu.start_date + 6
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_INVALID_WEEK_END';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items AS item
    WHERE item.day_of_week NOT BETWEEN 0 AND 6
       OR NOT (
         (item.meal_type = 'comida' AND item.dish_order IN (1, 2))
         OR (item.meal_type = 'cena' AND item.dish_order = 1)
       )
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_INVALID_SLOT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items AS item
    GROUP BY item.weekly_menu_id, item.day_of_week, item.meal_type, item.dish_order
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_DUPLICATE_SLOT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.weekly_menus AS menu
    LEFT JOIN auth.users AS auth_user ON auth_user.id = menu.user_id
    LEFT JOIN public.user_profiles AS profile ON profile.id = menu.user_id
    WHERE auth_user.id IS NULL OR profile.id IS NULL
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_ORPHAN_OWNER';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menu_items AS item
    LEFT JOIN public.weekly_menus AS menu ON menu.id = item.weekly_menu_id
    LEFT JOIN public.recipes AS recipe ON recipe.id = item.recipe_id
    WHERE menu.id IS NULL OR recipe.id IS NULL
  ) THEN
    RAISE EXCEPTION 'WM_MIGRATION_ORPHAN_ITEM_REFERENCE';
  END IF;
END;
$preconditions$;

ALTER TABLE public.weekly_menus
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT weekly_menus_user_start_date_key UNIQUE (user_id, start_date),
  ADD CONSTRAINT weekly_menus_start_date_monday_check
    CHECK (extract(isodow FROM start_date) = 1),
  ADD CONSTRAINT weekly_menus_end_date_check
    CHECK (end_date = start_date + 6);

ALTER TABLE public.menu_items
  ALTER COLUMN weekly_menu_id SET NOT NULL,
  ALTER COLUMN recipe_id SET NOT NULL,
  DROP CONSTRAINT menu_items_day_of_week_check,
  DROP CONSTRAINT menu_items_meal_type_check,
  DROP CONSTRAINT menu_items_weekly_menu_id_day_of_week_meal_type_dish_order_key,
  DROP CONSTRAINT menu_items_weekly_menu_id_fkey,
  DROP CONSTRAINT menu_items_recipe_id_fkey,
  ADD CONSTRAINT menu_items_slot_check CHECK (
    day_of_week BETWEEN 0 AND 6
    AND (
      (meal_type = 'comida' AND dish_order IN (1, 2))
      OR (meal_type = 'cena' AND dish_order = 1)
    )
  ),
  ADD CONSTRAINT menu_items_weekly_menu_id_day_of_week_meal_type_dish_order_key
    UNIQUE (weekly_menu_id, day_of_week, meal_type, dish_order),
  ADD CONSTRAINT menu_items_weekly_menu_id_fkey
    FOREIGN KEY (weekly_menu_id) REFERENCES public.weekly_menus(id) ON DELETE CASCADE,
  ADD CONSTRAINT menu_items_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE NO ACTION;

ALTER TABLE public.user_profiles
  ADD COLUMN planner_ref uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD CONSTRAINT user_profiles_planner_ref_key UNIQUE (planner_ref);

CREATE OR REPLACE FUNCTION public.protect_planner_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.planner_ref := pg_catalog.gen_random_uuid();
  ELSIF NEW.planner_ref IS DISTINCT FROM OLD.planner_ref THEN
    RAISE EXCEPTION 'WM_PLANNER_REF_IMMUTABLE'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_planner_ref() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_planner_ref() FROM anon;
REVOKE ALL ON FUNCTION public.protect_planner_ref() FROM authenticated;

DROP TRIGGER IF EXISTS protect_planner_ref_before_write ON public.user_profiles;
CREATE TRIGGER protect_planner_ref_before_write
  BEFORE INSERT OR UPDATE OF planner_ref ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_planner_ref();

CREATE OR REPLACE FUNCTION public.madrid_current_week_start()
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT madrid_today - (extract(isodow FROM madrid_today)::integer - 1)
  FROM (
    SELECT pg_catalog.timezone('Europe/Madrid', statement_timestamp())::date AS madrid_today
  ) AS clock;
$function$;

REVOKE ALL ON FUNCTION public.madrid_current_week_start() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.madrid_current_week_start() FROM anon;
REVOKE ALL ON FUNCTION public.madrid_current_week_start() FROM authenticated;

CREATE OR REPLACE FUNCTION public.resolve_weekly_menu_target(p_target_ref uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'WM_AUTH_REQUIRED'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_target_ref IS NULL THEN
    RETURN v_actor_id;
  END IF;

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'WM_FORBIDDEN'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT profile.id
  INTO v_owner_id
  FROM public.user_profiles AS profile
  WHERE profile.planner_ref = p_target_ref;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'WM_FORBIDDEN'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN v_owner_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_weekly_menu_target(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_weekly_menu_target(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_weekly_menu_target(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_weekly_menu_admin_targets()
RETURNS TABLE (target_ref uuid, target_label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'WM_AUTH_REQUIRED'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'WM_FORBIDDEN'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    profile.planner_ref AS target_ref,
    COALESCE(NULLIF(btrim(profile.alias), ''), 'Usuario')
      || ' · ' || left(replace(profile.planner_ref::text, '-', ''), 8) AS target_label
  FROM public.user_profiles AS profile
  ORDER BY target_label, target_ref;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM anon;
REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_menu_admin_targets() TO authenticated;

ALTER TABLE public.weekly_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "simple_policy_for_authenticated" ON public.weekly_menus;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.weekly_menus;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.weekly_menus;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.weekly_menus;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.weekly_menus;
DROP POLICY IF EXISTS "Users can delete own weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Users can insert own weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Users can update own weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "Users can view own weekly menus" ON public.weekly_menus;
DROP POLICY IF EXISTS "weekly_menus_select_policy" ON public.weekly_menus;
DROP POLICY IF EXISTS "weekly_menus_insert_policy" ON public.weekly_menus;
DROP POLICY IF EXISTS "weekly_menus_update_policy" ON public.weekly_menus;
DROP POLICY IF EXISTS "weekly_menus_delete_policy" ON public.weekly_menus;
DROP POLICY IF EXISTS "weekly menus select managed" ON public.weekly_menus;

CREATE POLICY "weekly menus select managed"
  ON public.weekly_menus
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Authenticated users can delete menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can view menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "menu items select managed" ON public.menu_items;

CREATE POLICY "menu items select managed"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.weekly_menus AS menu
      WHERE menu.id = weekly_menu_id
        AND (menu.user_id = auth.uid() OR public.current_user_is_admin())
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.weekly_menus FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.weekly_menus FROM authenticated;
GRANT SELECT ON TABLE public.weekly_menus TO authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.weekly_menus_id_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.weekly_menus_id_seq FROM authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.menu_items FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.menu_items FROM authenticated;
GRANT SELECT ON TABLE public.menu_items TO authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE public.menu_items_id_seq FROM anon;
REVOKE ALL PRIVILEGES ON SEQUENCE public.menu_items_id_seq FROM authenticated;

CREATE OR REPLACE FUNCTION public.save_weekly_menu(
  p_start_date date,
  p_slots jsonb,
  p_target_ref uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_menu_id integer;
  v_slot jsonb;
BEGIN
  v_owner_id := public.resolve_weekly_menu_target(p_target_ref);

  IF p_start_date IS NULL
     OR extract(isodow FROM p_start_date) <> 1 THEN
    RAISE EXCEPTION 'WM_INVALID_WEEK'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_start_date < public.madrid_current_week_start() THEN
    RAISE EXCEPTION 'WM_PAST_WEEK'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN
    RAISE EXCEPTION 'WM_INVALID_SLOTS'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF jsonb_array_length(p_slots) > 21 THEN
    RAISE EXCEPTION 'WM_INVALID_SLOTS'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots)
  LOOP
    IF jsonb_typeof(v_slot) <> 'object'
       OR NOT (v_slot ?& ARRAY[
         'day_of_week', 'meal_type', 'dish_order', 'recipe_id', 'sacado_del_congelador'
       ])
       OR (v_slot - ARRAY[
         'day_of_week', 'meal_type', 'dish_order', 'recipe_id', 'sacado_del_congelador'
       ]) <> '{}'::jsonb
       OR jsonb_typeof(v_slot->'day_of_week') <> 'number'
       OR jsonb_typeof(v_slot->'meal_type') <> 'string'
       OR jsonb_typeof(v_slot->'dish_order') <> 'number'
       OR jsonb_typeof(v_slot->'recipe_id') <> 'number'
       OR jsonb_typeof(v_slot->'sacado_del_congelador') <> 'boolean'
       OR (v_slot->>'day_of_week') !~ '^[0-6]$'
       OR (v_slot->>'dish_order') !~ '^[12]$'
       OR (v_slot->>'recipe_id') !~ '^[1-9][0-9]*$'
       OR (v_slot->>'recipe_id')::numeric > 2147483647
       OR NOT (
         ((v_slot->>'meal_type') = 'comida' AND (v_slot->>'dish_order') IN ('1', '2'))
         OR ((v_slot->>'meal_type') = 'cena' AND (v_slot->>'dish_order') = '1')
       ) THEN
      RAISE EXCEPTION 'WM_INVALID_SLOTS'
        USING ERRCODE = 'invalid_parameter_value';
    END IF;
  END LOOP;

  IF (
    SELECT count(*) <> count(DISTINCT (
      slot->>'day_of_week', slot->>'meal_type', slot->>'dish_order'
    ))
    FROM jsonb_array_elements(p_slots) AS slots(slot)
  ) THEN
    RAISE EXCEPTION 'WM_DUPLICATE_SLOT'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM recipe.id
  FROM public.recipes AS recipe
  WHERE recipe.id IN (
    SELECT (slot->>'recipe_id')::integer
    FROM jsonb_array_elements(p_slots) AS slots(slot)
  )
  ORDER BY recipe.id
  FOR KEY SHARE;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_slots) AS slots(slot)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.recipes AS recipe
      WHERE recipe.id = (slot->>'recipe_id')::integer
    )
  ) THEN
    RAISE EXCEPTION 'WM_RECIPE_UNAVAILABLE'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_start_date::text, 0)
  );

  IF jsonb_array_length(p_slots) = 0 THEN
    DELETE FROM public.weekly_menus
    WHERE user_id = v_owner_id
      AND start_date = p_start_date;
    RETURN NULL;
  END IF;

  INSERT INTO public.weekly_menus (
    start_date, end_date, user_id, is_saved, saved_at
  )
  VALUES (
    p_start_date, p_start_date + 6, v_owner_id, true, statement_timestamp()
  )
  ON CONFLICT (user_id, start_date) DO UPDATE
  SET end_date = EXCLUDED.end_date,
      is_saved = true,
      saved_at = statement_timestamp()
  RETURNING id INTO v_menu_id;

  DELETE FROM public.menu_items
  WHERE weekly_menu_id = v_menu_id;

  INSERT INTO public.menu_items (
    weekly_menu_id,
    recipe_id,
    day_of_week,
    meal_type,
    dish_order,
    sacado_del_congelador
  )
  SELECT
    v_menu_id,
    (slot->>'recipe_id')::integer,
    (slot->>'day_of_week')::integer,
    slot->>'meal_type',
    (slot->>'dish_order')::integer,
    (slot->>'sacado_del_congelador')::boolean
  FROM jsonb_array_elements(p_slots) AS slots(slot);

  RETURN v_menu_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_weekly_menu(date, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_weekly_menu(date, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.save_weekly_menu(date, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_weekly_menu(date, jsonb, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.empty_weekly_menu(
  p_start_date date,
  p_target_ref uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owner_id uuid;
  v_deleted_count integer;
BEGIN
  v_owner_id := public.resolve_weekly_menu_target(p_target_ref);

  IF p_start_date IS NULL
     OR extract(isodow FROM p_start_date) <> 1 THEN
    RAISE EXCEPTION 'WM_INVALID_WEEK'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_start_date < public.madrid_current_week_start() THEN
    RAISE EXCEPTION 'WM_PAST_WEEK'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner_id::text || ':' || p_start_date::text, 0)
  );

  DELETE FROM public.weekly_menus
  WHERE user_id = v_owner_id
    AND start_date = p_start_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.empty_weekly_menu(date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.empty_weekly_menu(date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.empty_weekly_menu(date, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.empty_weekly_menu(date, uuid) TO authenticated;
