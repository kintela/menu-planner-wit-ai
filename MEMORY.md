# Memoria del proyecto

## Estado actual del proyecto

Esta sección debe reflejar el estado real y vigente del proyecto.

El agente debe leer esta sección antes de proponer o realizar cambios importantes.

Debe actualizarse cuando una tarea cambie de forma relevante el estado funcional, técnico o de infraestructura del proyecto.

### Estado funcional actual

- La aplicación permite autenticación de usuarios.
- Cada usuario puede crear y gestionar sus propias recetas.
- Las recetas pueden utilizarse para planificar menús semanales.
- Los usuarios pueden valorar recetas, pero no sus propias recetas.
- La aplicación dispone de gestión de inventario de congeladores.
- Los congeladores pueden contener cajones y elementos.
- Existe funcionalidad para compartir congeladores entre usuarios.
- Los permisos de compartición contemplan los roles `owner`, `editor` y `viewer`.
- Existe un proceso automático de alertas de congelador mediante Vercel Cron.
- La aplicación utiliza OpenAI para generación de menús.

### Estado técnico actual

- Framework: Next.js 16.
- React: React 19.
- Lenguaje principal: TypeScript.
- Backend y base de datos: Supabase.
- Autenticación: Supabase mediante `@supabase/ssr` y cookies de sesión.
- Despliegue: Vercel.
- Gestión de paquetes: npm.
- El repositorio utiliza `package-lock.json`.
- ESLint 9 con configuración flat.
- Jest está configurado pero actualmente presenta problemas que impiden considerar fiable la suite de tests.
- `next.config.mjs` permite que la build termine aunque existan errores TypeScript.
- La comprobación de tipos debe realizarse independientemente con `npx tsc --noEmit`.

### Estado de autenticación y seguridad

- La autenticación del navegador utiliza `lib/supabase/client.ts`.
- El código de servidor utiliza `lib/supabase/server.ts`.
- `middleware.ts` refresca cookies de sesión, pero no constituye una barrera completa de autorización.
- `lib/auth.ts` y `lib/supabase/server.ts` son server-only por convención.
- Los Client Components deben utilizar `lib/auth-client.ts`.
- `SUPABASE_SERVICE_ROLE_KEY` debe permanecer exclusivamente en servidor.
- `OPENAI_API_KEY` debe permanecer exclusivamente en servidor.
- No debe sustituirse el sistema de autenticación actual por uno basado exclusivamente en `localStorage`.

### Estado de base de datos

- Los cambios de base de datos se mantienen actualmente como scripts SQL independientes en `scripts/*.sql`.
- No existe un sistema formal de migraciones configurado.
- No debe asumirse que todos los scripts SQL del repositorio han sido ejecutados en Supabase.
- Las tablas relacionadas con congeladores utilizan nombres en castellano.
- El sistema de compartición de congeladores utiliza `congeladores_usuarios`.
- Existe compatibilidad con propietarios antiguos cuando `congeladores_usuarios` no está disponible.

### Estado de recetas

- `app/recipes/page.tsx` carga datos desde Supabase.
- Existe una transformación de `menu_items` a `menu_ids`.
- El resultado se pasa a `components/recipes-page-client.tsx`.
- Este contrato debe mantenerse salvo que se revise explícitamente toda la cadena de consumidores.

### Estado del inventario de congeladores

- Las APIs de congeladores utilizan acceso mediante service-role a través de `lib/freezer-access.ts`.
- Se realizan comprobaciones explícitas de acceso.
- Se deben preservar los permisos `owner`, `editor` y `viewer`.
- El script `scripts/create-freezer-sharing.sql` define la estructura de compartición.
- Las entidades principales conocidas son:
  - `congeladores`
  - `cajones_congelador`
  - `elementos_cajon`

### Estado de automatizaciones

- Vercel ejecuta `/api/cron/freezer-alerts`.
- La planificación actual es `0 8 * * *`.
- Esta ruta puede enviar correos electrónicos reales.
- Las variables SMTP utilizadas son:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`

### Estado de OpenAI

- La integración de OpenAI se encuentra en `app/api/generate-menu/route.ts`.
- OpenAI se instancia a nivel de módulo.
- La aplicación depende de `OPENAI_API_KEY` en servidor.
- Los cambios en esta integración pueden afectar a coste, latencia y formato de respuesta.

## Decisiones vigentes

### Arquitectura

- Se mantiene Supabase como backend y sistema de autenticación.
- La autenticación debe seguir basada en cookies mediante `@supabase/ssr`.
- No migrar a autenticación basada únicamente en `localStorage`.
- La lógica sensible debe permanecer en servidor.
- Las operaciones con `SUPABASE_SERVICE_ROLE_KEY` nunca deben ejecutarse en cliente.

### Funcionalidad

- Cada usuario puede crear sus propias recetas.
- Las recetas pueden formar parte de menús semanales.
- Los usuarios pueden valorar recetas, pero no sus propias recetas.
- La aplicación incluye inventario de congeladores.
- Los congeladores pueden compartirse con permisos `owner`, `editor` y `viewer`.

## Problemas conocidos

- El README indica Next.js 14, pero el proyecto utiliza Next.js 16.
- `next.config.mjs` permite que la build continúe con errores TypeScript.
- `jest-environment-jsdom` no está declarado o instalado.
- La configuración de Jest utiliza `moduleNameMapping` en lugar de `moduleNameMapper`.
- `tests/run-tests.ts` referencia scripts npm inexistentes.
- No existe actualmente un script `npm test`.
- La suite Jest no debe considerarse fiable hasta resolver estos problemas.

## Decisiones pendientes

- Corregir la configuración de Jest.
- Decidir si se debe introducir un sistema formal de migraciones para Supabase.
- Revisar la duplicación de helpers de roles y permisos entre `lib/auth.ts` y `lib/auth-client.ts`.
- Revisar y actualizar el README para reflejar las versiones y arquitectura actuales.

## Actualización de esta memoria

Actualizar `MEMORY.md` cuando una tarea cambie de forma relevante:

- funcionalidades disponibles;
- arquitectura;
- autenticación;
- permisos;
- estructura de base de datos;
- integraciones externas;
- despliegue;
- problemas conocidos;
- decisiones técnicas importantes.

No actualizar esta memoria por cambios menores, cosméticos o temporales.