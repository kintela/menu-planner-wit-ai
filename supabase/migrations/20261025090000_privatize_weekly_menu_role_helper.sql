-- Keep parameterized weekly-menu role checks available to RLS but outside PostgREST RPC.

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.weekly_menu_profile_is_authorized(p_profile_id uuid)
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

REVOKE ALL ON FUNCTION private.weekly_menu_profile_is_authorized(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.weekly_menu_profile_is_authorized(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.weekly_menu_profile_is_authorized(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION private.weekly_menu_profile_is_authorized(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.weekly_menu_actor_is_authorized()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.weekly_menu_profile_is_authorized(auth.uid());
$function$;

REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM anon;
REVOKE ALL ON FUNCTION public.weekly_menu_actor_is_authorized() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_menu_actor_is_authorized() TO authenticated;

DROP POLICY IF EXISTS "weekly menus select managed" ON public.weekly_menus;
CREATE POLICY "weekly menus select managed"
  ON public.weekly_menus
  FOR SELECT
  TO authenticated
  USING (
    public.weekly_menu_actor_is_authorized()
    AND private.weekly_menu_profile_is_authorized(user_id)
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
        AND private.weekly_menu_profile_is_authorized(menu.user_id)
        AND (menu.user_id = auth.uid() OR public.current_user_is_admin())
    )
  );

DROP FUNCTION public.weekly_menu_profile_is_authorized(uuid);
