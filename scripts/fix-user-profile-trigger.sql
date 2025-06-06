-- Primero, verificar el estado actual del trigger
SELECT 'Checking current trigger status...' as status;

SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Verificar la función
SELECT 'Checking function status...' as status;

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Recrear la función con logging mejorado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role text := 'user_restricted'; -- Rol por defecto corregido
    full_name_value text;
    first_name_value text;
BEGIN
    -- Log del inicio de la función
    RAISE LOG 'handle_new_user triggered for user: % (email: %)', NEW.id, NEW.email;
    
    -- Verificar si el email es de administrador (solo protonmail)
    IF NEW.email = 'roberto.quintela@protonmail.com' THEN
        user_role := 'admin';
        RAISE LOG 'Admin role assigned to: %', NEW.email;
    ELSE
        RAISE LOG 'User_restricted role assigned to: %', NEW.email;
    END IF;

    -- Extraer nombres del metadata
    full_name_value := COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name',
        ''
    );
    
    first_name_value := COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        split_part(full_name_value, ' ', 1),
        ''
    );

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
        full_name_value,
        first_name_value,
        user_role,
        NOW(),
        NOW()
    );

    RAISE LOG 'Profile created successfully for user: % with role: %', NEW.email, user_role;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log detallado del error
        RAISE LOG 'ERROR creating user profile for % (ID: %): % - %', NEW.email, NEW.id, SQLSTATE, SQLERRM;
        -- No fallar el registro de usuario
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar que todo se creó correctamente
SELECT 'Verification after recreation...' as status;

SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
