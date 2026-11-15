# Base de datos

## Alcance

Supabase proporciona la base de datos de la aplicación. Este documento describe los contratos conocidos y el proceso actual de cambios; no sustituye al esquema real del entorno.

## Gestión de cambios

El historial de migraciones de Supabase está en `supabase/migrations/`. La baseline
`supabase/migrations/20261024000000_baseline.sql` es una copia intacta del snapshot
de producción aprobado; representa el punto de partida, no un cambio futuro ni una
instrucción para aplicarla sobre una base existente.

Los scripts SQL históricos se conservan como referencias independientes:

```text
scripts/*.sql
```

La presencia de una migración o script en el repositorio no demuestra que se haya
ejecutado en ningún entorno. No inferir el estado de aplicación a partir del contenido
del repositorio.

### Bases locales nuevas

Una base local nueva y desechable puede reconstruirse desde cero aplicando el historial
de `supabase/migrations/`, comenzando por la baseline. Este flujo no es para una base
existente ni implica autorización para ejecutar SQL en remoto.

### Cambios futuros

Para cada cambio futuro, generar una migración individual y ordenada con Supabase CLI
desde la raíz del repositorio:

```bash
supabase migration new <nombre>
```

Editar el nuevo archivo en `supabase/migrations/`; no alterar la baseline ni incorporar
cambios futuros en ella. Revisar el SQL, sus dependencias, impacto en RLS/permisos,
compatibilidad con datos existentes y estrategia de verificación/reversión antes de
aplicarlo.

Para previsualizar migraciones pendientes contra el entorno local explícitamente, usar
la modalidad local de dry-run disponible en Supabase CLI:

```bash
supabase db push --dry-run --local
```

Esta previsualización no aplica los cambios. Confirmar que la versión instalada admite
`--local` y que el destino es el Supabase local aislado antes de ejecutar el comando;
si no es posible confirmar el destino local, detenerse y no ejecutar una variante
linked, con URL de base de datos o que pueda dirigirse al remoto.

No ejecutar `supabase db push` contra remoto por defecto. Cualquier conexión,
previsualización dirigida a remoto o aplicación remota requiere autorización
independiente, explícita y previa. Nunca aplicar la baseline en remoto como parte del
flujo de base nueva.

Antes de cambiar datos o esquema:

1. Revisar el código que consume las tablas afectadas.
2. Revisar todos los scripts SQL relacionados.
3. Comparar, cuando sea posible y esté autorizado, el esquema esperado con el estado real del entorno objetivo.
4. Identificar políticas RLS, relaciones, triggers, funciones e índices afectados.
5. Preparar una aplicación y, si procede, una reversión explícitas.

No modificar ni ejecutar scripts contra producción sin autorización expresa.

### Adopción de una base existente

La baseline versionada es `supabase/migrations/20261024000000_baseline.sql`. Para adoptar una base ya existente, se registra esa versión como aplicada sin ejecutar el SQL de la baseline y sin inspeccionar ni comparar el estado remoto. Esto describe el procedimiento conceptual; no constituye autorización para operar sobre ningún entorno remoto.

La operación concreta de registro remoto (`supabase migration repair --status applied <version>`) requiere autorización remota independiente, explícita y previa. No ejecutar ni preparar esa operación, vincular el proyecto ni conectarse al remoto sin dicha autorización.

Los scripts históricos `scripts/*.sql` siguen siendo referencias independientes. Su presencia no permite inferir si se ejecutaron en ningún entorno ni su estado de aplicación.

## Dominios de datos

### Usuarios, recetas y menús

Los datos están asociados a usuarios autenticados. Cada usuario gestiona sus recetas y puede valorar recetas ajenas, pero no las propias. Esta restricción debe protegerse en servidor o base de datos, no sólo en la interfaz.

La migración `20261025010000_secure_recipes_categories_ratings_images.sql` define la
frontera persistente del dominio: proyección pública mínima de recetas, RLS de
propietario/administrador, catálogo global de categorías con nombres normalizados,
fusión transaccional, valoraciones privadas con agregado público y veto de
autoevaluación, y metadata privada para imágenes gestionadas. El bucket
`recipe-images` tiene lectura pública, pero sus escrituras quedan acotadas a una
receta gestionable. La presencia de esta migración no acredita su aplicación remota.

La migración posterior `20261025020000_harden_recipe_image_lifecycle.sql` revoca el
acceso directo autenticado a `recipe_managed_images` y mantiene privada la acreditación
de limpieza. RPCs con `search_path` fijo asocian, retiran y borran recetas de forma
atómica tras validar actor, ruta canónica y objeto cargado.

`20261025030000_enforce_recipe_image_transitions.sql` cierra las vías generales de
mutación de imagen: `authenticated` solo puede insertar o actualizar las columnas
no sensibles de `recipes`, mientras `image_url` queda reservada a las RPCs
`SECURITY DEFINER`. Storage DELETE exige siempre una autorización privada de limpieza
para `auth.uid()`; que un objeto sea la imagen gestionada vigente nunca basta para
borrarlo. La carga, sustitución, retirada y borrado de receta generan o trasladan esa
autorización explícitamente. Estas migraciones están aplicadas y validadas solo en el
stack local; no acreditan estado remoto.

`20261025040000_disable_direct_recipe_image_updates.sql` retira la policy heredada
de `UPDATE` sobre objetos de `recipe-images` sin sustituirla. Propietarios y
administradores no pueden actualizar ni mover directamente un objeto: la sustitución
usa un `INSERT` nuevo, la RPC de asociación y el `DELETE` autorizado de forma privada.
Las policies de `SELECT`, `INSERT` y `DELETE` permanecen vigentes. Esta migración está
aplicada y validada únicamente en el stack local.

La carga de recetas utiliza una relación `menu_items`. En `app/recipes/page.tsx` se transforma a `menu_ids` para `components/recipes-page-client.tsx`. Este contrato de aplicación debe preservarse al cambiar consultas, relaciones o tipos.

La FK `menu_items.recipe_id` definida por esa migración usa `ON DELETE NO ACTION`.
La API comprueba antes las referencias y falla cerrada; ninguna operación de recetas
elimina elementos de menú.

Las migraciones `20261025050000_secure_weekly_menus.sql`,
`20261025060000_weekly_menu_read_contract.sql` y
`20261025070000_weekly_menu_sources_contract.sql`, completadas por
`20261025080000_enforce_weekly_menu_actor_roles.sql` y
`20261025090000_privatize_weekly_menu_role_helper.sql`, constituyen la frontera persistente
del planificador semanal. Exigen propietario y semana lunes-domingo únicos, referencias
no nulas, los tres huecos válidos por día y unicidad de hueco; conservan la cascada de
cabecera a elementos y la FK de receta `ON DELETE NO ACTION`.

Las escrituras directas de `weekly_menus` y `menu_items` están revocadas para
`authenticated` y todo acceso anónimo está revocado. El guardado/reemplazo y el vaciado
se realizan mediante RPCs transaccionales con `search_path` vacío, fecha actual de
Madrid derivada en base de datos y resolución interna del propietario propio u objetivo
administrativo opaco. Las RPCs de lectura y fuentes devuelven únicamente el snapshot o
las fechas necesarias; el selector administrativo proyecta referencia opaca y etiqueta
segura. La migración `80000` exige además un perfil persistente con rol semanal admitido
para actor y propietario objetivo en helpers, RPCs y policies de lectura. La migración
`90000` mueve el helper parametrizado al esquema `private`, no expuesto por PostgREST,
y elimina su antigua firma pública para impedir sondeos de UUID; RLS conserva `USAGE` y
`EXECUTE` mínimos sobre el helper privado.

Estas cinco migraciones están aplicadas y validadas en el stack Docker local
`menu-planner-wit-ai`. El usuario confirmó manualmente mediante una captura de
`supabase migration list`, con timestamps UTC, que Local y Remote coinciden para
`20261025050000`–`20261025090000`. Esta constancia documental no supone una validación
remota independiente ni acredita un despliegue de la aplicación.

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

El sistema formal de migraciones de Supabase está establecido en `supabase/migrations/`, con una migración baseline versionada. Los scripts SQL históricos permanecen como referencias: no se asume que hayan sido aplicados ni forman parte del historial de migraciones. Para cambios futuros, crear migraciones trazables; el historial por sí solo no acredita qué migraciones están aplicadas en cada entorno.

## Estado de entornos

El contenido del historial no acredita qué migraciones están aplicadas en cada entorno.
La adopción de una base existente y toda operación remota siguen sujetas a autorización
independiente; consultar la sección «Adopción de una base existente».
