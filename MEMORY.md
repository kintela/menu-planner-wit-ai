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
- Jest para tests (bloqueado, ver problemas conocidos); los gates reales de las specs usan `node --test` (499/499 en verde a 2026-11-17).
- OpenAI para generación de menús.

### Estado de las specs (rama `feature/specs`, todo sin commitear)

- 001 Autenticación y sesión: **T1–T10 hechas y validadas funcionalmente en local** (RF-1–RF-12). Cerrada el 2026-11-15.
- 002 Perfil de usuario: T1–T10 hechas y verificadas en local.
- 003 Recetas y categorías: T1–T13 hechas y verificadas en local.
- 004 Menús semanales: T1–T9 hechas y verificadas en local y navegador.
- 005 Inventario de congeladores: replanificada (las T1–T10 antiguas con sharing quedaron invalidadas); nuevas T1–T8 hechas y verificadas en local.
- 011 Sistema de migraciones Supabase: T1–T8 hechas.
- 007 Alertas del congelador: spec, plan y tareas aprobados; **T1–T8 hechas y verificadas en local** (rama `feature/alertascongelador`, sin commitear). **Falta T9: crear `CRON_SECRET` en Vercel y desplegar, en ese orden.** La migración ya está aplicada en remoto.
- No existen ni se han reservado las specs 006, 008, 009 ni 010: el hueco de numeración hasta 011 es solo eso. 011 se numeró aparte por ser infraestructura, no funcionalidad de producto.

### Migraciones

- Local y remoto: **al día y coincidentes**, las 14 migraciones de `20261024000000` a `20261117000000` (salida de `supabase migration list --linked` aportada por el usuario el 2026-11-17). La última, `20261117000000_crear_avisos_elementos_cajon.sql`, es de la spec 007. No quedan migraciones pendientes de aplicar.
- El singleton de congeladores (`20261025100000`) está vigente también en producción: antes de aplicarlo se comprobó en remoto, en solo lectura, que había un único congelador y que su propietario tenía rol `admin`, las dos guardas de la migración.

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
- Alertas del congelador (spec 007): el cron se autoriza con `Authorization: Bearer <CRON_SECRET>`, nunca por user-agent ni cabeceras falsificables. Avisa una vez por elemento al cruzar el umbral y recuerda a los 30 días naturales, con estado en `avisos_elementos_cajon`. Los elementos se **reclaman antes de enviar** y se liberan solo los propios si el envío falla, para no duplicar correos con ejecuciones solapadas; la doble avería (envío y liberación fallidos) deja un elemento dado por avisado sin serlo hasta su recordatorio y queda registrada. No hay destinatarios por defecto. El botón de `/admin` ejecuta la misma lógica y respeta el registro, así que tras un aviso responde «sin novedades». Detalle en `docs/ARCHITECTURE.md`.
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
- **Hasta que se despliegue la spec 007, el cron de alertas sigue devolviendo 403 en producción** y no ha entregado ningún aviso desde febrero: el código antiguo buscaba el user-agent `vercel cron` (con espacio) y Vercel envía `vercel-cron/1.0`. Por la vía de administrador (`/admin`) sí funcionaba. Hay 11 elementos en producción por encima del umbral; el primer aviso correcto los incluirá todos.
- Hay listas de administradores por correo escritas en el código, con una dirección personal, en un repositorio público: `lib/auth.ts` (~línea 181), `lib/auth-client.ts` (`ADMIN_EMAILS`) y `app/api/admin/fix-missing-profiles/route.ts`. Además `app/test-email/page.tsx` precarga esa dirección. Detectado durante la spec 007; no se ha corregido por quedar fuera de su alcance. Conviene revisarlo junto con la duplicación de helpers de roles.
- `app/admin/users/page.tsx` y otros ficheros arrastran errores de `tsc` preexistentes: 283 errores únicos en el árbol actual, ninguno introducido por la spec 007 (comparado contra `HEAD`).
- Para probar la UI contra Supabase local: `next dev` con las variables de `supabase status` inyectadas en runtime (anulando las remotas de `.env.local`). `npm run dev` a secas usa `.env.local` y apunta a producción. El proyecto está vinculado al remoto (`PlanificadorMenus`): usar siempre `--local` en la CLI; la desvinculación hecha en octubre ya no está vigente.
- No existe ninguna interfaz para solicitar la recuperación de contraseña (`resetPasswordForEmail` no aparece en el código), y la plantilla de correo por defecto de Auth apunta a `/auth/v1/verify`, no a `/auth/callback`. Para que un enlace real termine en el callback haría falta una plantilla con `{{ .TokenHash }}` hacia `/auth/callback`. Es configuración del proveedor y alcance de producto, no un defecto del código.
- Al repetir pruebas locales de autenticación, entrar siempre por un único host: en `next dev` el `origin` del callback se resuelve a `localhost:3000` aunque se entre por `127.0.0.1:3000`, y como para cookies son hosts distintos la sesión se pierde. En producción el `origin` es el host real.
- `npx supabase` instala la CLI 3.1.0, que rechaza `[inbucket]` en `supabase/config.toml` (pide `[local_smtp]`) y rompe `supabase status`. Usar la CLI 2.120.0 de Homebrew (`/opt/homebrew/bin/supabase`) mientras el config no se migre.

## Decisiones pendientes

- **Cerrar spec 007 (T9), en este orden:** (1) crear `CRON_SECRET` en Vercel solo para Production, con un valor aleatorio propio (`openssl rand -hex 32`) y marcado como sensible; (2) comprobar que `FREEZER_ALERT_RECIPIENTS` en Vercel contiene las direcciones deseadas, porque ya no existe lista por defecto; (3) solo entonces desplegar; (4) revisar en los registros que la ejecución de las 08:00 UTC deja de dar 403. Si se despliega antes del paso 1, el cron seguirá dando 403, sin empeorar.
- Decidir qué hacer con las listas de administradores por correo en el código (ver problemas conocidos).
- Corregir la configuración de Jest.
- Revisar la duplicación de helpers de roles y permisos entre `lib/auth.ts` y `lib/auth-client.ts`.
- Revisar las dos rutas que aún concentran lógica (`admin/recipe-notifications`, `weekly-menu/share`), anotadas como excepciones al principio 3 de `docs/constitution.md`.

## Actualización de esta memoria

Actualizar `MEMORY.md` únicamente cuando cambie alguno de estos aspectos:

- funcionalidad disponible;
- decisión de arquitectura;
- decisión funcional importante;
- problema conocido;
- decisión pendiente;
- dependencia o integración crítica.

No utilizar `MEMORY.md` como historial detallado de commits ni para registrar cambios menores o cosméticos.
