---
name: congeladores
description: Úsala antes de tocar congeladores, cajones, elementos, sus APIs o su UI, incluidos app/api/freezer, lib/freezer, lib/freezer-access.ts y components/freezer
---
# Congeladores

Modelo vigente según **spec 005** (`specs/005-inventario-congeladores/`). Léela si el cambio es de cierta entidad.

## Modelo actual: congelador único global

- Existe **un solo congelador global**, con unicidad garantizada por un índice constante.
- Su propietario debe tener perfil persistido con rol `admin`.
- La identidad sale **solo** de la sesión de cookies.
- **Sin auto-creación:** `GET /api/freezer` responde 404 si no existe.
- Se preserva el contrato de respuesta `{ freezer, accessRole, isOwner }`.
- La UI solo muestra el inventario con `isOwner: true`.
- La denegación no debe ser enumerativa: no revelar la existencia de recursos a quien no tiene acceso.

## Compatibilidad histórica

Las memberships y los roles `owner` / `editor` / `viewer` **se conservan por compatibilidad histórica pero ya no autorizan**, y no se crean nuevas. Se mantiene también el fallback de propietario histórico para cuando `congeladores_usuarios` no está disponible: **no lo elimines**.

Si encuentras documentación que describa la compartición de congeladores entre usuarios como modelo vigente, está obsoleta: manda la spec 005.

## Estructura

La lógica vive en `lib/freezer/` (`freezer-domain.js`, `freezer-access-logic.js`, `freezer-presentation.js`), con `lib/freezer-access.ts` para el acceso mediante service-role y comprobaciones explícitas de usuario y permisos. **Las rutas de `app/api/freezer/` son adaptadores finos**: mantén esa separación.

Tablas en castellano: `congeladores`, `cajones_congelador`, `elementos_cajon`. No renombrar sin migración aprobada.

## Impresión

La página de impresión es un adaptador fino: impresión completa e independiente de la búsqueda, incluidos los cajones vacíos, con reservas distinguibles en blanco y negro. Los controles de impresión permanecen ocultos hasta confirmar la autorización en servidor.

## No confundir con las alertas

El cron `/api/cron/freezer-alerts` **no está adaptado** a este modelo y su ajuste pertenece a la spec 007, aún sin redactar. No lo toques desde una tarea de inventario: ver la skill `openai-cron`.
