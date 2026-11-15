# Tareas — Inventario de congeladores

> **Gate previo:** ninguna tarea de implementación puede comenzar hasta la
> aprobación explícita de `plan.md` y `tasks.md`. Trabajo solo local y aislado,
> sin remoto, sin commits ni correos. La migración formal solo se aplica al
> Supabase local; el remoto queda para un gate manual posterior. Cada tarea es
> secuencial, con test focal y gate `node --test`; las tareas de aplicación
> añaden lint. La demostración visual cubre desktop y mobile.

> **Reemplazo de tareas anteriores:** las T1–T10 anteriores quedan marcadas
> como no válidas/requieren nueva implementación. Asumían auto-creación por
> usuario y acceso funcional `owner`/`editor`/`viewer`; no se reutilizarán como
> evidencia de este cambio.

1. **T1 — Auditoría local del singleton, propietario admin y consumidores. — HECHA**
   Inspeccionar únicamente el catálogo local y el código real: unicidad,
   propietario vigente, perfil `admin`, filas históricas, memberships,
   fallback, cinco APIs, páginas, componentes, tests y contratos existentes.
   Revisar estáticamente el cron: el objetivo de Spec 007 es singleton más
   `user_profiles.email` del propietario; no modificarlo ni ejecutarlo.
    **RF:** RF-1–RF-27. **Hecho cuando:** existe matriz de estados y
    consumidores; se confirma si el esquema permite el singleton; cualquier
    impedimento detiene la implementación y exige revisión/aprobación nueva.

    **Informe de auditoría (solo lectura local, 2026-10-26):**

    - **Catálogo local agregado:** `congeladores=0`, `cajones_congelador=0`,
      `elementos_cajon=0` y `congeladores_usuarios=0`. `user_profiles` contiene
      dos perfiles `user_restricted` y ningún perfil `admin`. Por tanto no hay
      singleton ni propietario admin vigente que pueda confirmarse, y no se
      puede validar la carrera/estabilidad del recurso ni filas históricas en
      este estado. No se crearon fixtures ni se mutó el entorno.
    - **Esquema/migraciones inspeccionados:** existen las tablas y FKs
      castellanas esperadas, checks de cantidad/estado y RLS por propietario;
      `congeladores_usuario_id_key` solo garantiza como máximo un congelador
      por usuario, no un único congelador global. `congeladores_usuarios`
      conserva el check histórico `owner/editor/viewer` y grants amplios en el
      baseline. La unicidad global y la política exclusiva `admin` no quedan
      garantizadas por el esquema inspeccionado. No se ejecutó SQL ni se
      modificó la base de datos; el catálogo runtime se limitó a lecturas
      agregadas REST locales.
    - **Fallback/memberships:** el código actual conserva fallback por
      `congeladores.usuario_id`, pero `getAccessibleFreezerForUser` todavía
      enumera memberships y concede `owner/editor/viewer`; el GET todavía
      auto-crea por usuario. Esto contradice el modelo aprobado y los tests
      existentes de T3/T4 aún codifican el modelo anterior, por lo que no son
      evidencia de esta spec.
    - **Consumidores:** se identificaron las cinco rutas HTTP de inventario,
      `app/freezer/page.tsx`, `app/freezer/print/page.tsx`, los dos componentes
      de congelador y sus tests. Sus shapes CRUD/impresión permanecen como
      contratos a adaptar en tareas posteriores. `app/recipes/page.tsx` ya no
      contiene la transformación local, pero `lib/recipes/recipe-server-operations.js`
      conserva `menu_items -> menu_ids`; no se alterará ese contrato.
    - **Cron:** revisión estática de `app/api/cron/freezer-alerts/route.ts` y
      `vercel.json`; ambos permanecen sin cambios en el diff y no se ejecutó el
      cron. Su restricción al singleton/destinatario del propietario queda
      asignada a Spec 007.

     **Bloqueo:** el entorno local aislado no contiene singleton ni administrador
     vigente y el esquema actual no garantiza unicidad global. Se detiene la
     implementación. Este estado solo puede invalidarse mediante la nueva
     auditoría/validación posterior a la migración de T1-M; aplicar la
     migración por sí solo no desbloquea T1 ni T2.

  1 bis. **T1-M — Migración formal de singleton y revalidación local. — HECHA** Crear la
     migración versionada, sin escribirla ni aplicarla contra remoto, con
     precondiciones abortables: cero o un registro en `congeladores` y, si hay
     uno, propietario vigente cuyo perfil sea exactamente `admin`. Ante
     cualquier incumplimiento, abortar sin cleanup, sin borrar, reasignar o
     corregir silenciosamente datos; T1 permanece bloqueada. Si se cumplen,
     imponer un índice único global sobre una expresión constante que impida un
     segundo registro sin UUID fijo y sea seguro frente a carreras, preservando
     tablas/columnas castellanas, FKs y relaciones existentes, memberships
     históricas y fallback del propietario antiguo.
     
     Ejecutar el primer `supabase db push --dry-run --local` con fixtures
     sintéticos limpios, aplicar únicamente al Supabase local aislado, limpiar
     esos fixtures sin tocar datos ajenos y ejecutar un segundo dry-run local.
     Añadir tests estáticos de precondiciones, abort/rollback sin cleanup,
     unicidad global y preservación de contratos. La autorización que consumirán
     las tareas posteriores será exclusivamente server-side: sesión de cookies,
     perfil vigente `admin` e igualdad con el `usuario_id` persistido; nunca un
     UUID fijo ni identidad/rol aportados por el cliente. No usar membresías
     históricas para conceder acceso actual.
     **RF:** RF-3, RF-4, RF-23–RF-27. **Hecho cuando:** ambos dry-runs locales y
     la aplicación local aislada dejan evidencia verificable; los tests
     estáticos pasan; la revalidación posterior confirma cero o un singleton
     válido, propietario admin vigente, unicidad efectiva, relaciones y
     fallback intactos, fixtures limpios y ningún segundo registro. Solo
      entonces T1 deja de estar bloqueada y puede comenzar T2. El remoto no se
      toca: su aplicación será manual y posterior.

      **Evidencia T1-M (2026-10-26):** se creó `20261025100000_enforce_global_freezer_singleton.sql`.
      La migración aborta antes de cualquier cambio si hay más de un congelador o
      si el único propietario no tiene perfil vigente con rol exacto `admin`; no
      contiene cleanup, reasignaciones ni UUID fijo. Impone el índice único global
      sobre `(true)`, preserva las tablas/FKs y memberships históricas, y revoca
      grants de anónimos y de sharing histórico sin eliminar la tabla. Las
      funciones `SECURITY DEFINER` privadas usan `search_path = ''`; las políticas
      RLS exigen sesión autenticada, rol `admin` e igualdad con `usuario_id`.
      Tests estáticos focales: 4/4; `node --test`: 409/409; lint focal y
      `git diff --check`: OK. En Supabase local aislado: dry-run previo mostró la
      migración pendiente, aplicación única OK, fixture sintético temporal de
      perfil admin verificó inserción y rechazo del segundo registro, cleanup
      garantizado dejó `congeladores/cajones/elementos/memberships/admin =
      0/0/0/0/0`, y el segundo dry-run quedó limpio. No se tocó remoto.
       **T1 sigue BLOQUEADA**: esta migración y su aplicación no sustituyen la
       reauditoría/revalidación posterior exigida por el gate; T2 no comienza.

      **Revalidación T1 posterior a T1-M (solo lectura local, 2026-10-26):**

      - **Estado de datos:** el catálogo local aislado confirma
        `congeladores=0`, `cajones_congelador=0`, `elementos_cajon=0` y
        `congeladores_usuarios=0`. Hay dos perfiles `user_restricted` y cero
        perfiles `admin`; al no existir singleton, no hay propietario vigente
        que validar. No se crearon fixtures ni se ejecutó ninguna mutación.
      - **Unicidad y precondiciones:** existe y está aplicado
        `congeladores_singleton_global_idx` como índice único sobre `(true)`;
        `20261025100000` figura aplicada y `supabase db push --dry-run --local`
        devuelve `upToDate=true` sin migraciones pendientes. La migración
        contiene las precondiciones abortables de cero/uno congelador y
        propietario con rol exacto `admin`, sin cleanup, reasignación ni UUID
        fijo.
      - **RLS, policies y grants:** las tres tablas de inventario tienen RLS
        activo y policies únicamente para `authenticated`, condicionadas a
        sesión, rol `admin` y propiedad; `anon` no tiene grants ni policies.
        `congeladores_usuarios` conserva su tabla/check histórico, sin grants
        funcionales. Las funciones privadas no son ejecutables por `anon` y
        solo son ejecutables por `authenticated`.
      - **Preservación y consumidores:** las FKs
        `congelador–cajón–elemento` siguen presentes; memberships y fallback
        histórico por `usuario_id` siguen en el esquema/código. Se conservan
        las cinco rutas HTTP, páginas/componentes y shapes del inventario.
        `lib/recipes/recipe-server-operations.js` mantiene la transformación
        `menu_items -> menu_ids` y sus FKs/contratos no fueron afectados.
      - **Cron y no enumeración:** `app/api/cron/freezer-alerts/route.ts` y
        `vercel.json` no aparecen en el diff; el cron no se ejecutó. La
        combinación de grants/policies impide enumeración por anónimos y por
        usuarios no propietarios.

      **Resultado:** T1 queda **HECHA**. La evidencia satisface el estado
      permitido de cero congeladores y deja verificada la unicidad global,
      precondiciones, seguridad y preservación de contratos. T2 puede comenzar
      según el orden del plan; no se realizó trabajo de T2.

2. **T2 — Dominio puro y matriz de visibilidad. — HECHA** Escribir primero tests
   `node:test` y ajustar/reutilizar dominio y presentación para cantidad,
   estados, fechas, búsqueda sobre lo mostrado, cajones, impresión y una
   función pura de visibilidad/autorización de presentación que reciba `hoy`
   cuando corresponda; sin reloj global, red ni roles funcionales de sharing.
   **RF:** RF-5–RF-22, RF-27. **Hecho cuando:** pasan casos límite de la spec y
   toda función temporal recibe `hoy`/instante explícito.

   **Evidencia T2 (2026-10-26):** el dominio existente se conserva sin cambios
   funcionales: mantiene el catálogo cerrado de estados, cantidades opcionales
   no negativas con cero y decimales `,`/`.`, fechas civiles mostradas en
   `es-ES`, representación y búsqueda sobre lo mostrado, validaciones de
   cajones 1–5 solo ampliables y nombres/posiciones automáticos. Se añadió a
   la presentación pura `buildPresentacionAcceso`, que traduce únicamente el
   booleano de autorización ya resuelto por servidor en visibilidad del menú y
   controles del singleton privado; no contiene autorización ni roles de
   sharing. Los tests focales de dominio/presentación/impresión pasan 44/44,
   `node --test` pasa 410/410 y `npm run lint` pasa. No se usaron red, reloj
   global, base de datos, APIs, UI ni cron.

3. **T3 — Autorización exclusiva del propietario admin. — HECHA** Escribir primero
    tests y rehacer la política común de `lib/freezer-access*`: sesión por
    cookies, perfil exacto `admin`, coincidencia con `congeladores.usuario_id`,
    singleton y errores uniformes no enumerativos. La identidad se obtiene
    siempre en servidor; no se acepta UUID, identidad o rol desde el cliente y
    no se fija ningún UUID de propietario. Mantener fallback y tablas históricas
    sin conceder acceso; retirar de la decisión funcional memberships,
    invitaciones y owner/editor/viewer.
     **RF:** RF-1–RF-4, RF-23–RF-25, RF-27. **Hecho cuando:** anónimo, otro
     usuario, admin no propietario, perfil ausente y roles históricos reciben la
     misma denegación segura; solo el propietario admin continúa.

     **Evidencia T3 (2026-10-26):** tests `node:test` de la capa lógica cubren
     propietario admin, otro admin, admin sin singleton, anónimo, perfil ausente,
     rol NULL/no-admin, memberships históricas `owner`/`editor`/`viewer` y
     fallback sin tabla de sharing. La política exige sesión por cookies, rol
     persistido exacto `admin` y coincidencia con `congeladores.usuario_id`;
     memberships no conceden acceso y no se crean nuevas asociaciones. Focal
     7/7 y ESLint focal pasan; no se usaron red, remoto, fixtures persistentes,
     cron ni correo. Las pruebas antiguas de handlers de T4–T6 aún describen el
     modelo invalidado de sharing/auto-creación y quedan para sus tareas de
     adaptación.

4. **T4 — GET y cajones del singleton. — HECHA** Adaptar GET y cajones para resolver o
   dejar disponible solo el singleton del propietario admin, sin auto-creación
   por usuario; conservar unicidad/carrera, rango 1–5, ampliación y nombres
   automáticos. **RF:** RF-3–RF-8, RF-23–RF-27. **Hecho cuando:** los tests
   demuestran un único recurso, carrera segura, ningún recurso para otros y
    respuestas no enumerativas.

   **Evidencia T4 (2026-10-26):** `GET /api/freezer` solo resuelve el
   singleton existente del propietario admin autenticado mediante cookies; la
   ausencia responde 404 controlado sin INSERT ni membership y un admin ajeno
   no puede enumerarlo. Se preserva `{ freezer, accessRole, isOwner }` con
   `owner/true`. `POST /api/freezer/drawers` conserva el contrato
   `{ freezerId, totalCajones }`, exige propietario admin, valida entero 1–5,
   permite únicamente ampliación (igual es no-op), rechaza reducción/fuera de
   rango con 400 y genera nombres/posiciones en servidor. Tests focales
   `35/35`, `node --test` `370/370`, ESLint focal y `git diff --check` pasan;
   no se usaron red, remoto, memberships nuevas, UI ni cron.

5. **T5 — CRUD de elementos y vaciado. — HECHA** Adaptar las rutas existentes,
   manteniendo alta, edición/movimiento intra-singleton, reserva, borrado y
   vaciado por cajón; validar en servidor y aplicar autorización exclusiva
    antes de mutar. **RF:** RF-8–RF-19, RF-23–RF-27. **Hecho cuando:** el ciclo
    completo funciona para el admin propietario y toda petición ajena,
    inexistente o manipulada no altera ni revela datos.

   **Evidencia T5 (2026-10-26):** los manejadores puros de alta, edición/movimiento,
   reserva, borrado individual y vaciado por cajón reciben el cliente de sesión
   por cookies y verifican además el singleton persistido del propietario admin
   antes de leer o mutar recursos. Se mantienen la validación del dominio, la
   allowlist, el movimiento intra-singleton, la reserva reversible no bloqueante,
   los borrados definitivos inclusivos de reservados y la ausencia de vaciado
   global. Las denegaciones permanecen no enumerativas y las rutas son
   adaptadores finos sin identidad aportada por el cliente.

6. **T6 — UI de gestión y menú. — HECHA** Hacer que menú, gestión y controles de
   escritura solo sean visibles para el propietario admin; otros usuarios y
   anónimos tienen comportamiento uniforme de no disponibilidad. Conservar
   cantidades, defaults con `hoy`, búsqueda, confirmaciones, consulta e
   impresión del actor autorizado. **RF:** RF-1, RF-5–RF-21, RF-23.
   **Hecho cuando:** la UI no enumera el singleton, no envía identidad como
   autorización y los tests de presentación pasan.

7. **T7 — Impresión y regresiones. — HECHA** Mantener impresión completa, cajones
   vacíos, reservas, fecha/hora e independencia de búsqueda; verificar
   contratos de recetas/menús, nombres castellanos, fallback histórico y que
   `app/api/cron/freezer-alerts/route.ts` y `vercel.json` no se hayan tocado.
     **RF:** RF-13, RF-22, RF-25–RF-26. **Hecho cuando:** tests de impresión y
     revisión estática pasan; el ajuste futuro del cron queda explícitamente
     asignado a Spec 007.

   **Evidencia T7 (2026-10-26):** se conservaron la autorización server-side
   mediante `isOwner`, la impresión completa independiente de búsqueda, todos
   los cajones incluidos los vacíos, los campos y formatos compartidos del
   dominio, reservas sombreadas distinguibles en blanco y negro, fecha/hora y
   las acciones de imprimir/guardar PDF. Se añadió `scope="col"` a la tabla
   para accesibilidad. La página de impresión sigue siendo un adaptador fino,
   sin Bearer, selector ni sharing; cron y `vercel.json` no fueron modificados.
   Los controles de imprimir/PDF quedan ocultos hasta confirmar esa
   autorización. El test focal de impresión pasó 4/4.

 8. **T8 — Verificación integral local y demostración visual. — HECHA** Ejecutar tests
   focales y `node --test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` y
   `git diff --check`, separando bloqueos preexistentes. Demostrar visitante,
   otro usuario y propietario admin en desktop/mobile, incluido CRUD, búsqueda,
    impresión, singleton y denegación no enumerativa. Revisar secretos, alcance
    y trazabilidad completa. El gate final confirma que la migración y sus dos
    dry-runs fueron locales; cualquier aplicación en remoto queda como paso
    manual posterior, fuera de esta tarea y sin ejecutarse. **RF:** RF-1–RF-27.
     **Hecho cuando:** toda evidencia está registrada, no hay operaciones
     remotas/cron/correo y las limitaciones no se presentan como validaciones
     exitosas.

     **Evidencia T8 (2026-10-27):** focales de inventario `185/185`, `node --test`
     `373/373`, `npm run lint` OK, `npm run build` OK y `git diff --check` OK.
     `npx tsc --noEmit` conserva deuda heredada fuera del alcance (tipos de Jest,
     `nodemailer`, componentes históricos, `vaul` y errores previos de páginas/API);
     la build omite la validación TypeScript por configuración existente. La
     revisión estática confirmó `menu_items -> menu_ids` en
     `lib/recipes/recipe-server-operations.js`, FK de recetas NO ACTION, nombres
     castellanos, fallback histórico sin acceso, y que cron/Vercel no cambiaron.
     La migración `20261025100000` y sus dry-runs permanecen locales; su aplicación
     remota queda como paso manual pendiente.

     La demo se ejecutó contra Supabase local aislado, sin remoto, cron, SMTP,
     OpenAI ni `.env.local`: visitante en desktop/mobile sin menú, otro usuario
     sin enumeración ni acceso, y propietario admin en desktop/mobile. El admin
     verificó singleton, cajón, alta con cantidad decimal/coma, reserva, búsqueda
     por fecha visible, impresión completa independiente de búsqueda y controles
     CRUD. Se usaron dos usuarios, un congelador, un cajón y un elemento
     sintéticos; se eliminaron usuarios y filas, comprobando `0/0/0/0` para
     congelador/cajones/elementos/usuarios sintéticos. No quedan fixtures ni
     decisiones pendientes de esta spec.
