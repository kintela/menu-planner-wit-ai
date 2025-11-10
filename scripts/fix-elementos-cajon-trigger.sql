-- Ajusta el trigger de elementos_cajon para tablas con columna `actualizado_en`
-- Ejecutar en la consola SQL de Supabase.

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists trg_elementos_cajon_updated_at on public.elementos_cajon;

create trigger trg_elementos_cajon_updated_at
before update on public.elementos_cajon
for each row
execute function public.set_actualizado_en();
