---
name: supabase-db
description: Úsala antes de tocar esquema, tablas, columnas, índices, relaciones, políticas RLS, triggers, funciones SQL, permisos o migraciones de Supabase, y siempre que vayas a usar el service-role o a ejecutar la CLI de Supabase
---
# Supabase y base de datos

`docs/DATABASE.md` describe el modelo de datos y el estado de los entornos. Esta skill cubre cómo operar sin romperlo.

## Antes de proponer cualquier cambio de datos

1. Revisa el código que usa las tablas afectadas.
2. Revisa los scripts SQL y migraciones relacionados.
3. Determina si depende de cambios manuales hechos antes en Supabase.
4. **Nunca asumas que un script de `scripts/*.sql` se ha ejecutado**, ni que lo definido en un script coincide con el estado real de producción.

No modifiques esquema, tablas, columnas, índices, relaciones, políticas RLS, triggers, funciones SQL, scripts existentes ni permisos sin autorización explícita.

## Migraciones

Las migraciones viven en `supabase/migrations/`, con una baseline byte por byte desde `supabase/production-schema.sql`. Las posteriores son versionadas e individuales.

- **El usuario aplica y registra manualmente las migraciones en remoto.** Los agentes no operan contra remoto sin autorización explícita previa e independiente.
- El Supabase local de `menu-planner-wit-ai` está separado del remoto y del stack `contabilidad`.
- **El proyecto está vinculado al remoto (`PlanificadorMenus`): usa siempre `--local` en la CLI.**
- Usa la CLI 2.120.0 de Homebrew (`/opt/homebrew/bin/supabase`). `npx supabase` instala la 3.1.0, que rechaza `[inbucket]` en `supabase/config.toml` y rompe `supabase status`.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` es exclusivamente de servidor. Nunca en Client Components, nunca en JavaScript enviado al navegador, nunca en variables `NEXT_PUBLIC_*`, nunca en respuestas de API, nunca en logs.

No la uses como atajo para evitar RLS o resolver un problema de permisos, y no traslades a cliente operaciones que hoy la requieren.

## Operaciones destructivas

No ejecutes `DROP`, `TRUNCATE` ni `DELETE` masivos sin autorización explícita. No ejecutes scripts SQL contra producción. No borres datos de Supabase para hacer pruebas: crea registros sintéticos y elimínalos al terminar, verificando que no quedan filas.

## Convenciones

Los nombres de tablas y columnas del dominio de congeladores están en castellano (`congeladores`, `cajones_congelador`, `elementos_cajon`). No los renombres sin una migración explícita y aprobada.
