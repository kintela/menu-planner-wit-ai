-- Crear el perfil para roberto.quintela@icloud.com
-- Nota: Este email NO es admin (solo protonmail lo es)
INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    first_name,
    role,
    created_at,
    updated_at
) VALUES (
    '82f0bb2c-4f07-409b-8341-94f548ff0b95',
    'roberto.quintela@icloud.com',
    'Roberto Quintela',
    'Roberto',
    'user_restricted', -- Rol por defecto ya que no es el email de admin
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT * FROM public.user_profiles 
WHERE id = '82f0bb2c-4f07-409b-8341-94f548ff0b95';
