# Base de datos

## Alcance

Supabase proporciona la base de datos de la aplicación. Este documento describe los contratos conocidos y el proceso actual de cambios; no sustituye al esquema real del entorno.

## Gestión de cambios

Los cambios de base de datos se conservan como scripts SQL independientes:

```text
scripts/*.sql
```

Actualmente no existe un sistema formal y automático de migraciones. La presencia de un script en el repositorio no demuestra que se haya ejecutado en desarrollo, preproducción o producción.

Antes de cambiar datos o esquema:

1. Revisar el código que consume las tablas afectadas.
2. Revisar todos los scripts SQL relacionados.
3. Comparar, cuando sea posible y esté autorizado, el esquema esperado con el estado real del entorno objetivo.
4. Identificar políticas RLS, relaciones, triggers, funciones e índices afectados.
5. Preparar una aplicación y, si procede, una reversión explícitas.

No modificar ni ejecutar scripts contra producción sin autorización expresa.

## Dominios de datos

### Usuarios, recetas y menús

Los datos están asociados a usuarios autenticados. Cada usuario gestiona sus recetas y puede valorar recetas ajenas, pero no las propias. Esta restricción debe protegerse en servidor o base de datos, no sólo en la interfaz.

La carga de recetas utiliza una relación `menu_items`. En `app/recipes/page.tsx` se transforma a `menu_ids` para `components/recipes-page-client.tsx`. Este contrato de aplicación debe preservarse al cambiar consultas, relaciones o tipos.

### Congeladores

Las entidades principales conocidas usan nombres en castellano:

- `congeladores`: contenedor principal del inventario.
- `cajones_congelador`: cajones pertenecientes a un congelador.
- `elementos_cajon`: elementos almacenados en un cajón.
- `congeladores_usuarios`: asociación de usuarios, congeladores y permisos de compartición.

No deben renombrarse tablas o columnas sin una migración explícita y una revisión de todos los consumidores.

El script de referencia para la compartición es:

```text
scripts/create-freezer-sharing.sql
```

Los permisos soportados son:

- `owner`: propietario del congelador.
- `editor`: usuario con capacidad de edición según las reglas de la aplicación.
- `viewer`: usuario con acceso de lectura.

`lib/freezer-access.ts` usa service-role desde servidor y realiza comprobaciones explícitas de acceso. También existe compatibilidad con propietarios antiguos para entornos donde `congeladores_usuarios` no esté disponible. No eliminar ese fallback sin confirmar el estado de los entornos y planificar la migración.

## Seguridad de datos

- Aplicar el principio de mínimo privilegio.
- Mantener y revisar las políticas RLS cuando cambie el acceso a una entidad.
- No utilizar service-role para eludir errores de diseño de RLS o autorización.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en servidor.
- No devolver detalles SQL, credenciales ni información interna sensible en errores de API.
- No ejecutar `DROP`, `TRUNCATE`, borrados masivos ni modificaciones destructivas sin autorización y un plan de recuperación.

La autenticación y los controles de acceso se detallan en `docs/AUTH.md`.

## Convenciones para nuevos cambios

Cada cambio de base de datos debería dejar claro:

- objetivo y dependencias;
- entorno o entornos donde debe aplicarse;
- orden de ejecución;
- compatibilidad con datos existentes;
- efectos sobre RLS y permisos;
- cambios requeridos en código y tipos;
- método de verificación;
- estrategia de reversión cuando sea viable.

Mientras no exista un sistema formal de migraciones, no editar un script ya aplicado con la expectativa de que el cambio llegue automáticamente a los entornos. Crear un cambio trazable y documentar su aplicación.

## Pendiente estructural

Está pendiente decidir si el proyecto adoptará una herramienta formal de migraciones de Supabase. Hasta entonces, el estado real de cada entorno debe tratarse como una condición que hay que verificar, no como una consecuencia automática del repositorio.
