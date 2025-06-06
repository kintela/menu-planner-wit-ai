-- Verificar si existe el trigger
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user_profile%' OR trigger_name LIKE '%handle_new_user%';

-- Verificar si existe la función
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%user_profile%' OR routine_name LIKE '%handle_new_user%';
