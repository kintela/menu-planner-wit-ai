-- Crear o reemplazar la función que maneja nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role text := 'user_full'; -- Rol por defecto
BEGIN
    -- Verificar si el email es de administrador
    IF NEW.email = 'roberto.quintela@protonmail.com' THEN
        user_role := 'admin';
    END IF;

    -- Insertar el perfil del usuario
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        first_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1)),
        user_role,
        NOW(),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log del error pero no fallar el registro
        RAISE LOG 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
