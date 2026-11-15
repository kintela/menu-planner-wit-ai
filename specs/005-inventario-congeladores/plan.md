# Plan — Inventario de congeladores

## Estado y gates

Este plan deriva de los requisitos funcionales aprobados para el cambio de
alcance de Spec 005. Queda **pendiente de aprobación explícita**, junto con
`tasks.md`, antes de implementar código o escribir SQL.

Gates obligatorios:

- trabajo exclusivamente local y aislado; no se inspecciona, compara, aplica
  ni registra nada en Supabase remoto;
- no se ejecutan comandos remotos, no se despliega y no se envían correos;
- la migración formal se implementa y aplica únicamente en el Supabase local
  aislado, después de aprobar este plan; nunca se aplica contra remoto;
- el gate es: migración local, segundo dry-run y validación post-migración
  primero; cualquier aplicación remota posterior es manual, separada y exige
  autorización explícita;
- validación con `node --test`, `npx tsc --noEmit`, `npm run lint` y, al
  afectar rutas/UI, `npm run build`; los bloqueos conocidos de Jest siguen sin
  convertir Jest en gate;
- se conserva el gate de demostración visual local en escritorio y móvil;
- las tareas son secuenciales y cada una debe dejar su test focal y el gate
  general en estado verificable antes de iniciar la siguiente.

### Invalidación explícita del plan anterior

Las tareas T1–T10 del plan anterior **ya no son válidas como implementación**:
su modelo de auto-creación por usuario, memberships funcionales y matriz
`owner`/`editor`/`viewer` contradice el singleton del administrador aprobado.
Requieren una nueva implementación derivada de este plan. Se pueden reutilizar
tests o utilidades únicamente después de revisar sus supuestos; no se acepta
como evidencia la ejecución previa de aquellas tareas.

La auditoría T1 quedó bloqueada por la ausencia de singleton y administrador
local y por la falta de unicidad global. Su bloqueo no se levanta por crear una
migración: solo una nueva auditoría/validación posterior a la migración,
incluida en la tarea de adecuación local, puede declarar satisfechas sus
precondiciones y permitir T2.

## Estado actual relevante inspeccionado

- La implementación real conserva `congeladores`, `cajones_congelador`,
  `elementos_cajon` y `congeladores_usuarios`; la capa de acceso todavía
  resuelve memberships y roles `owner`/`editor`/`viewer`, y el GET todavía
  modela auto-creación por usuario.
- `lib/freezer-access.ts` y
  `lib/freezer/freezer-access-logic.js` son la frontera server-side actual y
  usan service-role. Debe conservarse esa frontera, pero la autorización debe
  exigir sesión, perfil vigente `admin` y coincidencia con `congeladores.usuario_id`.
- Las cinco rutas HTTP existentes y los dos componentes de congeladores son
  los consumidores funcionales del inventario. Sus contratos CRUD, búsqueda e
  impresión deben seguir disponibles únicamente para el administrador
  autorizado.
- `app/freezer/page.tsx` y `app/freezer/print/page.tsx` montan UI sin gate
  propio. La UI debe dejar de presentar el menú/vista a visitantes y a otros
  usuarios, sin confiar en ello como autorización.
- `app/api/cron/freezer-alerts/route.ts` consulta elementos sin restringirlos
  explícitamente al singleton y usa destinatarios configurables/default. Ese
  ajuste pertenece a Spec 007: aquí se audita y se documenta el impacto, pero
  no se modifica ni se ejecuta el cron.

## Enfoque funcional y técnico mínimo

### 1. Auditoría local previa

Auditar solo en el entorno local el singleton, propietario vigente, perfil
`admin`, índice/constraints, filas históricas, memberships y fallback. La
auditoría debe distinguir datos válidos, datos históricos y estados
incompatibles, sin conceder acceso por el mero hecho de existir una membership.
Si el estado local impide garantizar unicidad o propiedad, la auditoría deja el
gate bloqueado y deriva a la tarea de migración formal; no se escribe ni aplica
SQL durante esta auditoría.

También se revisarán los consumidores HTTP/UI y se hará una revisión estática
del cron: el contrato objetivo de Spec 007 es procesar solo el singleton y
enviar al `user_profiles.email` de su propietario; la ruta, el correo y la
configuración de Vercel quedan fuera de la implementación de Spec 005.

### 1 bis. Migración formal y revalidación local

La migración versionada propuesta se ejecutará solo sobre el Supabase local
aislado. Antes de aplicarla debe comprobar, dentro de una transacción abortable,
las precondiciones: `congeladores` contiene cero o un registro y, si contiene
uno, su `usuario_id` corresponde al propietario vigente cuyo perfil tiene rol
exacto `admin`. Si alguna precondición falla, la operación aborta sin cleanup,
sin borrar, reasignar ni corregir silenciosamente datos, y T1 continúa
bloqueada.

Cuando las precondiciones se cumplen, la migración debe imponer un índice único
global sobre una expresión constante de `congeladores`, robusto frente a
carreras y que no dependa de un UUID fijo ni permita un segundo registro,
preservando tablas y columnas castellanas, claves y
relaciones congelador–cajón–elemento, memberships históricas y fallback por
propietario antiguo. No debe crear memberships ni convertir `owner`, `editor` o
`viewer` en autorización actual. El servidor autorizará por sesión de cookies,
perfil vigente `admin` e igualdad con el `usuario_id` persistido; nunca por un
UUID fijo ni por datos aportados por el cliente.

Antes de aplicar se hará `supabase db push --dry-run --local` con fixtures
sintéticos limpios y aislados; después se aplicará únicamente al Supabase
local, se limpiarán los fixtures sin tocar datos ajenos y se repetirá el
dry-run local. Tests estáticos comprobarán las guardas, la unicidad global y la
preservación de contratos. Solo la revalidación posterior que confirme un
singleton válido, propietario admin vigente, relaciones/fallback intactos y
ausencia de segundo registro desbloquea T1 y permite T2. Nunca se hará
dry-run, aplicación o registro contra remoto; ese paso queda manual y
posterior.

### 2. Dominio puro y política de autorización

Reutilizar o ajustar utilidades puras sin red, Supabase ni reloj global. Toda
función temporal recibe `hoy`/instante como parámetro explícito. La lógica debe
cubrir:

- catálogo y parseo de estado;
- cantidad opcional, incluyendo cero y decimales con `,` o `.`;
- fechas y cantidades formateadas para la búsqueda sobre lo mostrado;
- decisión de cajones 1–5, solo ampliación, y nombres/posiciones automáticos;
- representación, búsqueda e impresión compartidas;
- resultado de presentación `esAdministradorAutorizado` y visibilidad del
  menú, sin modelar permisos funcionales de sharing.

La autorización server-side será una sola política: identidad de sesión,
perfil cuyo rol exacto sea `admin`, y `usuario_id` igual al propietario vigente
del único congelador. El cliente nunca aporta identidad ni autorización.

Los roles y memberships históricos pueden leerse para compatibilidad y el
fallback de propietario antiguo se conserva, pero ningún `owner`, `editor` o
`viewer` distinto del propietario admin concede acceso actual. Las respuestas
para anónimo y para cualquier otro usuario serán uniformes y no enumerarán el
singleton, sus cajones ni sus elementos.

### 3. APIs y singleton

Adaptar las rutas existentes sin crear una arquitectura paralela:

- GET resuelve el singleton del propietario admin vigente y no auto-crea
  congeladores por usuario; si el requisito de disponibilidad inicial exige
  creación, solo puede crear el singleton asociado a ese propietario y debe
  resolver la carrera mediante la unicidad existente;
- cajones validan servidor, rango, ampliación y nombres automáticos;
- elementos mantienen alta, edición completa con movimiento intra-singleton,
  reserva reversible, borrado individual y vaciado por cajón;
- búsqueda e impresión conservan sus contratos y la impresión ignora la
  búsqueda;
- todo acceso no autorizado falla de forma uniforme antes de revelar datos,
  incluyendo recursos inexistentes o ajenos.

La creación o resolución del singleton no usará una cuenta o UUID fijo: el
servidor obtiene la identidad de la sesión por cookies, carga el perfil vigente
y solo autoriza al rol exacto `admin` cuya identidad coincide con el propietario
persistido. El cliente no puede seleccionar el propietario ni elevar su rol.

No se crean memberships nuevas para habilitar el producto, no se gestionan
sharing/invitaciones y no se elimina ni se altera el fallback histórico.

### 4. UI y regresiones

El menú y las vistas de gestión/impresión solo se presentan al administrador
propietario autorizado. Visitantes y otros usuarios reciben la misma
experiencia de no disponibilidad, sin mensajes que permitan inferir si existe
el congelador. Los endpoints siguen protegidos aunque la UI esté oculta.

Se preservan CRUD, búsqueda sobre la representación visible, impresión
completa, confirmaciones, contratos de tablas en castellano y los contratos
de recetas/menús no relacionados. No se toca el cron, OpenAI, SMTP, Vercel ni
la configuración remota.

## Archivos y trazabilidad

| Área | Archivos previstos | RF |
|---|---|---|
| Migración y validación de esquema | `supabase/migrations/<timestamp>_enforce_global_freezer_singleton.sql`, tests estáticos y fixtures locales temporales | RF-3, RF-4, RF-23–RF-27 |
| Dominio y presentación pura | `lib/freezer/freezer-domain.js`/`.d.ts`, `lib/freezer/freezer-presentation.js`/`.d.ts` o utilidades equivalentes ya existentes | RF-5–RF-22, RF-27 |
| Autorización server-side | `lib/freezer/freezer-access-logic.js`, `lib/freezer-access.ts` | RF-1–RF-4, RF-23–RF-25, RF-27 |
| Route Handlers | `app/api/freezer/route.ts`, `app/api/freezer/drawers/route.ts`, `app/api/freezer/items/route.ts`, `app/api/freezer/items/[itemId]/route.ts`, `app/api/freezer/drawers/[drawerId]/items/route.ts` | RF-1–RF-8, RF-13–RF-19, RF-23–RF-27 |
| Visibilidad y experiencia | `app/freezer/page.tsx`, `app/freezer/print/page.tsx`, `components/freezer/freezer-manager.tsx`, `components/freezer/freezer-print.tsx` | RF-1, RF-20–RF-23 |
| Tests | `tests/unit/**` y `tests/scripts/**` aplicables, con `node:test` | RF-1–RF-27 |
| Auditoría/impacto de alertas | revisión estática de `app/api/cron/freezer-alerts/route.ts` y `vercel.json`; sin modificación en Spec 005 | RF-26 |

La migración SQL forma parte ahora del alcance aprobado del plan, pero se
escribirá y aplicará solo tras aprobar este plan y únicamente en el Supabase
local aislado. La aplicación remota no forma parte de la ejecución: será un
paso manual posterior, con revisión del estado remoto y autorización explícita.

## Decisiones y alternativas descartadas

- **Singleton por propietario admin vigente:** se descarta un congelador por
  usuario porque contradice el objetivo doméstico único y crea superficies de
  autorización innecesarias.
- **Autorización por sesión + perfil admin + propietario:** se descarta confiar
  en `user_profiles.role` sin comparar `usuario_id`, y se descarta una cuenta o
  UUID fijo porque la spec exige propiedad vigente.
- **Unicidad por propietario o valor fijo:** se descarta porque permite varios
  congeladores globales o ata el diseño a una cuenta concreta; se elige una
  unicidad global de la tabla, con precondiciones verificadas antes de migrar.
- **Memberships solo históricas:** se descarta usar `owner`/`editor`/`viewer`
  como permisos actuales; se conservan para lectura/fallback y no se crean
  nuevas asociaciones.
- **Denegación uniforme no enumerativa:** se descarta distinguir “ajeno” de
  “inexistente” ante usuarios no autorizados porque confirmaría el singleton.
- **Gate server-side además de UI:** se descarta ocultar solamente el menú; las
  cinco rutas vuelven a comprobar autorización con datos de servidor.
- **Cron fuera de Spec 005:** se descarta modificar o ejecutar la ruta aquí;
  Spec 007 debe hacer que consulte solo el singleton y use
  `user_profiles.email` del propietario, preservando mientras tanto el
  comportamiento actual sin intervención en esta spec.
- **Sin dependencia nueva ni cambio de Jest:** se mantiene `node:test` con
  dobles inyectados, sin red, secretos, correo ni reloj global.
- **Aplicación remota automática:** se descarta; el gate remoto es manual y
  posterior a la validación local completa.

## Estrategia de tests y validación

Los tests focales se escribirán antes del cambio de cada contrato. Deben cubrir:

- singleton ausente, existente y carrera de creación, sin auto-creación de
  congeladores para otros usuarios;
- precondiciones de migración con cero congeladores, un congelador con
  propietario admin y estados incompatibles; abortos sin cleanup;
- unicidad global frente a un segundo registro, preservación de relaciones,
  nombres castellanos, memberships históricas y fallback, más doble dry-run
  local y fixtures sintéticos limpios;
- administrador propietario admitido; administrador no propietario,
  `user_full`, `user_restricted`, perfil inexistente, anónimo y memberships
  históricas `owner`/`editor`/`viewer` denegados de forma uniforme;
- fallback sin tabla de sharing sin conceder acceso adicional;
- cajones, elementos, reserva, vaciado, búsqueda e impresión según RF-5–RF-22;
- entradas manipuladas, recursos inexistentes/ajenos y ausencia de
  enumeración;
- UI sin menú/controles para no autorizados y visible solo para el propietario
  admin, en desktop y mobile cuando el entorno local lo permita;
- revisión estática de que el cron no se modifica en esta spec y de que los
  contratos `menu_items -> menu_ids`, nombres castellanos y demás regresiones
  quedan intactos.

La tarea de migración ejecutará, si el entorno lo permite, el dry-run local
previo, la aplicación local aislada, el segundo `supabase db push
--dry-run --local` y los tests estáticos, sin tocar remoto. Al cierre se
ejecutarán, si el entorno lo permite, `node --test`,
`npx tsc --noEmit`, `npm run lint`, `npm run build` y `git diff --check`.
Jest se reportará como bloqueado mientras persistan sus problemas conocidos.
No se afirmará ninguna validación no ejecutada.

## Impactos declarados

- **Supabase/base de datos:** migración formal versionada y validada solo en el
  Supabase local aislado; ningún comando ni aplicación remota. El remoto queda
  para una aplicación manual posterior.
- **Autenticación/autorización:** sí; se restringe al propietario admin vigente.
- **APIs/UI:** sí; se conserva CRUD, búsqueda e impresión, pero se elimina el
  acceso funcional de usuarios no propietarios.
- **Sharing histórico:** se preserva para compatibilidad, sin conceder acceso.
- **Alertas:** no se modifica ni ejecuta el cron; el cambio de singleton y
  destinatario pertenece a Spec 007.
- **Recetas/menús, OpenAI, SMTP, Vercel, dependencias y variables:** sin
  cambios.
