-- The singleton is adopted only when the existing data is already safe.
-- This migration deliberately does not repair, reassign, or remove rows.
DO $migration$
DECLARE
  freezer_count integer;
  freezer_owner uuid;
BEGIN
  SELECT count(*) INTO freezer_count
  FROM public.congeladores;

  IF freezer_count > 1 THEN
    RAISE EXCEPTION 'No se puede adoptar el singleton: hay más de un congelador';
  END IF;

  IF freezer_count = 1 THEN
    SELECT usuario_id INTO freezer_owner
    FROM public.congeladores;

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_profiles AS profile
      WHERE profile.id = freezer_owner
        AND profile.role = 'admin'::public.user_role
    ) THEN
      RAISE EXCEPTION 'No se puede adoptar el singleton: el propietario no tiene perfil admin vigente';
    END IF;
  END IF;
END
$migration$;

-- The admin owner is validated by the server/RLS against the current session;
-- this schema never embeds a fixed account or UUID.
-- A constant expression, rather than a user id, makes the invariant global.
CREATE UNIQUE INDEX congeladores_singleton_global_idx
  ON public.congeladores ((true));

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.congelador_admin_actor()
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
      AND (
        NOT EXISTS (SELECT 1 FROM public.congeladores)
        OR EXISTS (
          SELECT 1
          FROM public.congeladores AS freezer
          WHERE freezer.usuario_id = auth.uid()
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.congelador_admin_access(p_congelador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT private.congelador_admin_actor()
    AND EXISTS (
      SELECT 1
      FROM public.congeladores AS freezer
      WHERE freezer.id = p_congelador_id
        AND freezer.usuario_id = auth.uid()
    );
$function$;

REVOKE ALL ON FUNCTION private.congelador_admin_actor() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.congelador_admin_actor() FROM anon;
REVOKE ALL ON FUNCTION private.congelador_admin_actor() FROM authenticated;
GRANT EXECUTE ON FUNCTION private.congelador_admin_actor() TO authenticated;
REVOKE ALL ON FUNCTION private.congelador_admin_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.congelador_admin_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.congelador_admin_access(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION private.congelador_admin_access(uuid) TO authenticated;

-- Baseline grants were broader than this product boundary. Historical sharing
-- remains in place, but is not a functional access path for this singleton.
REVOKE ALL ON TABLE public.congeladores FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cajones_congelador FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.elementos_cajon FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.congeladores_usuarios FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.congeladores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cajones_congelador TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.elementos_cajon TO authenticated;

DROP POLICY IF EXISTS congeladores_delete_own ON public.congeladores;
DROP POLICY IF EXISTS congeladores_insert_own ON public.congeladores;
DROP POLICY IF EXISTS congeladores_select_own ON public.congeladores;
DROP POLICY IF EXISTS congeladores_update_own ON public.congeladores;
CREATE POLICY congeladores_delete_own ON public.congeladores
  FOR DELETE TO authenticated
  USING (private.congelador_admin_access(id));
CREATE POLICY congeladores_insert_own ON public.congeladores
  FOR INSERT TO authenticated
  WITH CHECK (private.congelador_admin_actor() AND usuario_id = auth.uid());
CREATE POLICY congeladores_select_own ON public.congeladores
  FOR SELECT TO authenticated
  USING (private.congelador_admin_access(id));
CREATE POLICY congeladores_update_own ON public.congeladores
  FOR UPDATE TO authenticated
  USING (private.congelador_admin_access(id))
  WITH CHECK (private.congelador_admin_access(id) AND usuario_id = auth.uid());

DROP POLICY IF EXISTS cajones_congelador_delete_own ON public.cajones_congelador;
DROP POLICY IF EXISTS cajones_congelador_insert_own ON public.cajones_congelador;
DROP POLICY IF EXISTS cajones_congelador_select_own ON public.cajones_congelador;
DROP POLICY IF EXISTS cajones_congelador_update_own ON public.cajones_congelador;
CREATE POLICY cajones_congelador_delete_own ON public.cajones_congelador
  FOR DELETE TO authenticated
  USING (private.congelador_admin_access(congelador_id));
CREATE POLICY cajones_congelador_insert_own ON public.cajones_congelador
  FOR INSERT TO authenticated
  WITH CHECK (private.congelador_admin_access(congelador_id));
CREATE POLICY cajones_congelador_select_own ON public.cajones_congelador
  FOR SELECT TO authenticated
  USING (private.congelador_admin_access(congelador_id));
CREATE POLICY cajones_congelador_update_own ON public.cajones_congelador
  FOR UPDATE TO authenticated
  USING (private.congelador_admin_access(congelador_id))
  WITH CHECK (private.congelador_admin_access(congelador_id));

DROP POLICY IF EXISTS elementos_cajon_delete_own ON public.elementos_cajon;
DROP POLICY IF EXISTS elementos_cajon_insert_own ON public.elementos_cajon;
DROP POLICY IF EXISTS elementos_cajon_select_own ON public.elementos_cajon;
DROP POLICY IF EXISTS elementos_cajon_update_own ON public.elementos_cajon;
CREATE POLICY elementos_cajon_delete_own ON public.elementos_cajon
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cajones_congelador AS drawer
    WHERE drawer.id = cajon_id
      AND private.congelador_admin_access(drawer.congelador_id)
  ));
CREATE POLICY elementos_cajon_insert_own ON public.elementos_cajon
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cajones_congelador AS drawer
    WHERE drawer.id = cajon_id
      AND private.congelador_admin_access(drawer.congelador_id)
  ));
CREATE POLICY elementos_cajon_select_own ON public.elementos_cajon
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cajones_congelador AS drawer
    WHERE drawer.id = cajon_id
      AND private.congelador_admin_access(drawer.congelador_id)
  ));
CREATE POLICY elementos_cajon_update_own ON public.elementos_cajon
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cajones_congelador AS drawer
    WHERE drawer.id = cajon_id
      AND private.congelador_admin_access(drawer.congelador_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cajones_congelador AS drawer
    WHERE drawer.id = cajon_id
      AND private.congelador_admin_access(drawer.congelador_id)
  ));
