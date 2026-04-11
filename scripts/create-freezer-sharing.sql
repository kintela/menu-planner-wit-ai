-- Permite que un mismo congelador sea visible para varios usuarios.
-- Mantiene public.congeladores.usuario_id como propietario original
-- y añade una tabla intermedia para accesos compartidos.

create table if not exists public.congeladores_usuarios (
  id uuid primary key default gen_random_uuid(),
  congelador_id uuid not null references public.congeladores(id) on delete cascade,
  usuario_id uuid not null references public.user_profiles(id) on delete cascade,
  rol text not null default 'editor' check (rol in ('owner', 'editor', 'viewer')),
  creado_en timestamptz not null default timezone('utc', now())
);

create unique index if not exists congeladores_usuarios_unique_idx
  on public.congeladores_usuarios (congelador_id, usuario_id);

create index if not exists congeladores_usuarios_usuario_idx
  on public.congeladores_usuarios (usuario_id);

create index if not exists congeladores_usuarios_congelador_idx
  on public.congeladores_usuarios (congelador_id);

insert into public.congeladores_usuarios (congelador_id, usuario_id, rol)
select c.id, up.id, 'owner'
from public.congeladores c
join public.user_profiles up on up.id = c.usuario_id
on conflict (congelador_id, usuario_id)
do update set rol = excluded.rol;
