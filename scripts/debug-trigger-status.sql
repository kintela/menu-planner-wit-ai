-- Verificar si el trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Verificar si la función existe
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Verificar permisos en la tabla user_profiles
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name = 'user_profiles';
