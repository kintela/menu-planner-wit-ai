-- Require a current persisted weekly-menu role at every database authorization boundary.

CREATE OR REPLACE FUNCTION public.weekly_menu_profile_is_authorized(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS profile
    WHERE profile.id = p_profile_id
      AND profile.role IN (
        'user_restricted'::public.user_role,
        'user_full'::public.user_role,
        'admin'::public.user_role
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.weekly_menu_profile_is_authorized(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.weekly_menu_profile_is_authorized(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.weekly_menu_profile_is_authorized(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_menu_profile_is_authorized(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.weekly_menu_actor_is_authorized()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT public.weekly_menu_profile_is_authorized(auth.uid());
$function$;

REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM anon;
REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_menu_actor_is_authorized() TO authenticated;

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

  IF NOT public.weekly_menu_actor_is_authorized() THEN
    RAISE EXCEPTION 'WM_FORBIDDEN'
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
  WHERE profile.planner_ref = p_target_ref
    AND profile.role IN (
      'user_restricted'::public.user_role,
      'user_full'::public.user_role,
      'admin'::public.user_role
    );

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

  IF NOT public.weekly_menu_actor_is_authorized()
     OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'WM_FORBIDDEN'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    profile.planner_ref AS target_ref,
    COALESCE(NULLIF(btrim(profile.alias), ''), 'Usuario')
      || ' · ' || left(replace(profile.planner_ref::text, '-', ''), 8) AS target_label
  FROM public.user_profiles AS profile
  WHERE profile.role IN (
    'user_restricted'::public.user_role,
    'user_full'::public.user_role,
    'admin'::public.user_role
  )
  ORDER BY target_label, target_ref;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM anon;
REVOKE ALL ON FUNCTION public.get_weekly_menu_admin_targets() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_menu_admin_targets() TO authenticated;

DROP POLICY IF EXISTS "weekly menus select managed" ON public.weekly_menus;
CREATE POLICY "weekly menus select managed"
  ON public.weekly_menus
  FOR SELECT
  TO authenticated
  USING (
    public.weekly_menu_actor_is_authorized()
    AND public.weekly_menu_profile_is_authorized(user_id)
    AND (user_id = auth.uid() OR public.current_user_is_admin())
  );

DROP POLICY IF EXISTS "menu items select managed" ON public.menu_items;
CREATE POLICY "menu items select managed"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (
    public.weekly_menu_actor_is_authorized()
    AND EXISTS (
      SELECT 1
      FROM public.weekly_menus AS menu
      WHERE menu.id = weekly_menu_id
        AND public.weekly_menu_profile_is_authorized(menu.user_id)
        AND (menu.user_id = auth.uid() OR public.current_user_is_admin())
    )
  );
