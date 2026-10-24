# Memoria del proyecto

Este archivo contiene únicamente el estado actual del proyecto, decisiones vigentes, problemas conocidos y decisiones pendientes.

El agente debe leer este archivo antes de realizar cambios no triviales.

La documentación técnica detallada se encuentra en:

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/AUTH.md`

## Estado actual

### Funcionalidad

Actualmente la aplicación permite:

- Autenticación de usuarios.
- Creación y gestión de recetas por usuario.
- Valoración de recetas de otros usuarios.
- Un usuario no puede valorar sus propias recetas.
- Uso de recetas para planificar menús semanales.
- Gestión de inventario de congeladores.
- Organización de congeladores mediante cajones y elementos.
- Compartición de congeladores entre usuarios.
- Permisos de congelador `owner`, `editor` y `viewer`.
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
- Jest para tests.
- OpenAI para generación de menús.

## Decisiones vigentes

- Mantener Supabase como backend y sistema de autenticación.
- Mantener la autenticación basada en cookies mediante `@supabase/ssr`.
- No sustituir la autenticación por un sistema basado exclusivamente en `localStorage`.
- Mantener la lógica sensible exclusivamente en servidor.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe utilizarse en cliente.
- `OPENAI_API_KEY` debe permanecer exclusivamente en servidor.
- Cada usuario puede gestionar sus propias recetas.
- Los usuarios pueden valorar recetas de otros usuarios, pero no las propias.
- Los congeladores pueden compartirse con permisos `owner`, `editor` y `viewer`.

## Problemas conocidos

- El README indica Next.js 14, pero el proyecto utiliza Next.js 16.
- `next.config.mjs` permite que la build continúe aunque existan errores TypeScript.
- `jest-environment-jsdom` no está declarado o instalado.
- La configuración de Jest utiliza `moduleNameMapping` en lugar de `moduleNameMapper`.
- `tests/run-tests.ts` referencia scripts npm inexistentes.
- Actualmente no existe un script `npm test`.
- La suite Jest no debe considerarse fiable hasta resolver estos problemas.

## Decisiones pendientes

- Corregir la configuración de Jest.
- Decidir si se debe introducir un sistema formal de migraciones para Supabase.
- Revisar la duplicación de helpers de roles y permisos entre `lib/auth.ts` y `lib/auth-client.ts`.
- Actualizar el README para reflejar correctamente las versiones y arquitectura actuales.

## Últimos cambios relevantes

Mantener aquí únicamente cambios recientes que afecten de forma significativa al comportamiento o arquitectura del proyecto.

Eliminar entradas antiguas cuando ya estén reflejadas correctamente en la documentación permanente.

## Actualización de esta memoria

Actualizar `MEMORY.md` únicamente cuando cambie alguno de estos aspectos:

- funcionalidad disponible;
- decisión de arquitectura;
- decisión funcional importante;
- problema conocido;
- decisión pendiente;
- dependencia o integración crítica.

No utilizar `MEMORY.md` como historial detallado de commits ni para registrar cambios menores o cosméticos.