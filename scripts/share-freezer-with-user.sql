-- Comparte un congelador existente con otro usuario a partir de los emails.
-- Antes ejecuta scripts/create-freezer-sharing.sql

with params as (
  select
    'roberto.quintela@protonmail.com'::text as owner_email,
    'soniamuga@yahoo.es'::text as shared_email,
    'Mi congelador'::text as freezer_name,
    'editor'::text as access_role
),
owner_freezer as (
  select c.id
  from public.congeladores c
  join public.user_profiles owner_profile on owner_profile.id = c.usuario_id
  join params p on true
  where owner_profile.email = p.owner_email
    and c.nombre = p.freezer_name
  limit 1
),
shared_user as (
  select up.id
  from public.user_profiles up
  join params p on true
  where up.email = p.shared_email
  limit 1
)
insert into public.congeladores_usuarios (congelador_id, usuario_id, rol)
select owner_freezer.id, shared_user.id, params.access_role
from owner_freezer
cross join shared_user
cross join params
on conflict (congelador_id, usuario_id)
do update set rol = excluded.rol;
