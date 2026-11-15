# Memoria del proyecto

Este archivo contiene únicamente el estado actual del proyecto, decisiones vigentes, problemas conocidos y decisiones pendientes.

El agente debe leer este archivo antes de realizar cambios no triviales.

La documentación técnica detallada se encuentra en:

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/AUTH.md`

Las specs SDD viven en `specs/NNN-*/` (`spec.md`, `plan.md`, `tasks.md`); el estado detallado de cada tarea está en su `tasks.md`.

## Estado actual

### Funcionalidad

Actualmente la aplicación permite:

- Autenticación de usuarios.
- Creación y gestión de recetas por usuario.
- Valoración de recetas de otros usuarios.
- Un usuario no puede valorar sus propias recetas.
- Uso de recetas para planificar menús semanales.
- Gestión de inventario de un único congelador global (singleton) del administrador, organizado en cajones y elementos.
- Alertas automáticas relacionadas con congeladores.
- Generación de menús mediante OpenAI.

### Tecnología

- Next.js 16.
- React 19.
- TypeScript.
- Supabase como backend, base de datos y autenticación.
- `@supabase/ssr` y cookies para sesiones.
- Vercel para despliegue.
- npm y `package-lock.json`.
- ESLint 9.
- Jest para tests (bloqueado, ver problemas conocidos); los gates reales de las specs usan `node --test` (382/382 en verde a 2026-11-15).
- OpenAI para generación de menús.

### Estado de las specs (rama `feature/specs`, todo sin commitear)

- 001 Autenticación y sesión: **T1–T10 hechas y validadas funcionalmente en local** (RF-1–RF-12). Cerrada el 2026-11-15.
- 002 Perfil de usuario: T1–T10 hechas y verificadas en local.
- 003 Recetas y categorías: T1–T13 hechas y verificadas en local.
- 004 Menús semanales: T1–T9 hechas y verificadas en local y navegador.
- 005 Inventario de congeladores: replanificada (las T1–T10 antiguas con sharing quedaron invalidadas); nuevas T1–T8 hechas y verificadas en local.
- 011 Sistema de migraciones Supabase: T1–T8 hechas.
- 007 Alertas del congelador: referenciada por 005, todavía no redactada.
- No existen ni se han reservado las specs 006, 008, 009 ni 010: el hueco de numeración hasta 011 es solo eso. 011 se numeró aparte por ser infraestructura, no funcionalidad de producto.

### Migraciones

- Local: aplicadas `20261024000000` a `20261025100000`.
- Remoto: según captura de `supabase migration list` aportada por el usuario, coinciden con local hasta `20261025090000` (incluye 001–004). No hubo validación remota independiente.
- Pendiente en remoto: `20261025100000_enforce_global_freezer_singleton.sql` (spec 005), aplicación manual del usuario.

## Decisiones vigentes

- `docs/constitution.md` fija los seis principios innegociables del proyecto y la jerarquía documental: constitución (principios) → `AGENTS.md` (reglas operativas) → skill `sdd` (flujo) → `MEMORY.md` (estado) → `docs/*` (referencia técnica).

- `AGENTS.md` contiene solo lo que puede causar daño real y lo no deducible del código; el detalle temático vive en skills bajo demanda (`sdd`, `supabase-db`, `auth`, `congeladores`, `openai-cron`) y en `docs/`. **Las reglas de seguridad no se mueven a skills**: una skill solo se carga si el agente la invoca, y otras herramientas (opencode) pueden no leerlas.

- Mantener Supabase como backend y sistema de autenticación.
- Mantener la autenticación basada en cookies mediante `@supabase/ssr`.
- No sustituir la autenticación por un sistema basado exclusivamente en `localStorage`.
- Mantener la lógica sensible exclusivamente en servidor.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe utilizarse en cliente.
- `OPENAI_API_KEY` debe permanecer exclusivamente en servidor.
- Cada usuario puede gestionar sus propias recetas.
- Los usuarios pueden valorar recetas de otros usuarios, pero no las propias.
- Migraciones en `supabase/migrations/`, con baseline byte por byte desde `supabase/production-schema.sql`; las futuras son versionadas e individuales. El usuario aplica/registra manualmente las migraciones en remoto. Los agentes no operan contra remoto sin autorización explícita previa. El Supabase local de `menu-planner-wit-ai` está separado del remoto y del stack `contabilidad`.
- Recetas (spec 003): lectura pública con proyección mínima (alias/agregados, sin PII); escrituras de recetas/categorías/ratings/imágenes autorizadas por sesión con RLS; borrado de recetas usadas en menús bloqueado por FK; `recipes.image_url` solo se modifica mediante RPCs atómicas de imagen (INSERT + asociación RPC + DELETE autorizado, sin UPDATE directo en `recipe-images`).
- Menús (spec 004): semana lunes–domingo, guardado/vaciado/copia explícitos, pasado de solo lectura, objetivo admin opaco y guard de cambios sin guardar; allowlist persistente de roles y helpers en esquema privado no expuesto por PostgREST. Se preserva `menu_items -> menu_ids`.
- Autenticación (spec 001): la lógica de cierre de sesión y de clasificación de fallos del callback vive en el módulo puro `lib/auth-flow/auth-flow.js`, sin red ni dependencias de Next/Supabase, para poder probarla con `node --test`. El cierre de sesión se revoca en servidor **antes** de limpiar la interfaz y navegar a `/login`; si el servidor no lo confirma, la sesión y el estado se conservan. La URL de `/login` nunca transporta el texto a mostrar: solo un código público (`recovery_expired`, `recovery_error`, `auth_error`) que la aplicación traduce a un aviso fijo.
- Perfil (spec 002): un fallo al asociar un avatar conserva el anterior y no se notifica como éxito. `/api/debug-storage` responde siempre 404.
- Congeladores (spec 005): un único congelador global (unicidad por índice constante) cuyo propietario debe tener perfil persistido `admin`. La identidad sale solo de la sesión de cookies; memberships y roles `owner`/`editor`/`viewer` se conservan por compatibilidad histórica pero **no** autorizan ni se crean nuevas. Sin auto-creación: GET `/api/freezer` responde 404 si no existe, preservando `{ freezer, accessRole, isOwner }`. La UI solo muestra inventario con `isOwner: true`. Se mantiene el fallback de propietario histórico. Lógica en `lib/freezer/` con rutas como adaptadores finos.

## Problemas conocidos

- `next.config.mjs` permite que la build continúe aunque existan errores TypeScript.
- `npx tsc --noEmit` arrastra deuda preexistente (tests Jest, nodemailer, `vaul`, componentes y páginas históricas).
- `jest-environment-jsdom` no está declarado o instalado.
- La configuración de Jest utiliza `moduleNameMapping` en lugar de `moduleNameMapper`.
- `tests/run-tests.ts` referencia scripts npm inexistentes.
- Actualmente no existe un script `npm test`.
- La suite Jest no debe considerarse fiable hasta resolver estos problemas.
- `/api/cron/freezer-alerts` no está adaptado al modelo singleton de spec 005 (trabajo asignado a spec 007).
- Para probar la UI contra Supabase local: `next dev` con las variables de `supabase status` inyectadas en runtime (anulando las remotas de `.env.local`). `npm run dev` a secas usa `.env.local` y apunta a producción. El proyecto está vinculado al remoto (`PlanificadorMenus`): usar siempre `--local` en la CLI; la desvinculación hecha en octubre ya no está vigente.
- No existe ninguna interfaz para solicitar la recuperación de contraseña (`resetPasswordForEmail` no aparece en el código), y la plantilla de correo por defecto de Auth apunta a `/auth/v1/verify`, no a `/auth/callback`. Para que un enlace real termine en el callback haría falta una plantilla con `{{ .TokenHash }}` hacia `/auth/callback`. Es configuración del proveedor y alcance de producto, no un defecto del código.
- Al repetir pruebas locales de autenticación, entrar siempre por un único host: en `next dev` el `origin` del callback se resuelve a `localhost:3000` aunque se entre por `127.0.0.1:3000`, y como para cookies son hosts distintos la sesión se pierde. En producción el `origin` es el host real.
- `npx supabase` instala la CLI 3.1.0, que rechaza `[inbucket]` en `supabase/config.toml` (pide `[local_smtp]`) y rompe `supabase status`. Usar la CLI 2.120.0 de Homebrew (`/opt/homebrew/bin/supabase`) mientras el config no se migre.

## Decisiones pendientes

- Redactar spec 007 (alertas del congelador sobre el singleton).
- Aplicar en remoto `20261025100000` (manual, usuario).
- Commitear el trabajo de `feature/specs`.
- Corregir la configuración de Jest.
- Revisar la duplicación de helpers de roles y permisos entre `lib/auth.ts` y `lib/auth-client.ts`.
- Revisar las tres rutas que concentran lógica (`admin/recipe-notifications`, `weekly-menu/share`, `cron/freezer-alerts`), anotadas como excepciones al principio 3 de `docs/constitution.md`.

## Actualización de esta memoria

Actualizar `MEMORY.md` únicamente cuando cambie alguno de estos aspectos:

- funcionalidad disponible;
- decisión de arquitectura;
- decisión funcional importante;
- problema conocido;
- decisión pendiente;
- dependencia o integración crítica.

No utilizar `MEMORY.md` como historial detallado de commits ni para registrar cambios menores o cosméticos.
