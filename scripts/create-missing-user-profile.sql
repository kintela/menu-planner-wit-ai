-- Crear el perfil para el usuario que ya existe
INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    role,
    created_at,
    updated_at
) VALUES (
    'a6c144a3-59a3-43dd-9912-39c95355c5aa',
    'marcosmbaranda@gmail.com',
    'Marcos Baranda', -- Puedes ajustar este nombre
    'Marcos',
    'user_full',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT * FROM public.user_profiles WHERE id = 'a6c144a3-59a3-43dd-9912-39c95355c5aa';
