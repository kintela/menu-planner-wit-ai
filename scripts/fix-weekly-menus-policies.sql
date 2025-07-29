-- Eliminar todas las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON weekly_menus;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON weekly_menus;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON weekly_menus;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON weekly_menus;
DROP POLICY IF EXISTS "Users can delete own weekly menus" ON weekly_menus;
DROP POLICY IF EXISTS "Users can insert own weekly menus" ON weekly_menus;
DROP POLICY IF EXISTS "Users can update own weekly menus" ON weekly_menus;
DROP POLICY IF EXISTS "Users can view own weekly menus" ON weekly_menus;

-- Crear políticas simples y claras
-- SELECT: Los usuarios pueden ver sus propios menús, los admins pueden ver todos
CREATE POLICY "weekly_menus_select_policy" ON public.weekly_menus
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- INSERT: Los usuarios pueden crear sus propios menús, los admins pueden crear cualquiera
CREATE POLICY "weekly_menus_insert_policy" ON public.weekly_menus
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- UPDATE: Los usuarios pueden actualizar sus propios menús, los admins pueden actualizar cualquiera
CREATE POLICY "weekly_menus_update_policy" ON public.weekly_menus
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- DELETE: Los usuarios pueden eliminar sus propios menús, los admins pueden eliminar cualquiera
CREATE POLICY "weekly_menus_delete_policy" ON public.weekly_menus
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Verificar que RLS esté habilitado
ALTER TABLE public.weekly_menus ENABLE ROW LEVEL SECURITY;