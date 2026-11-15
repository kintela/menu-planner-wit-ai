# Plan — Planificación de menús semanales

## Estado y gate de aprobación

La spec RF-1–RF-30 está aprobada. Este plan y sus tareas quedan **pendientes de aprobación explícita**.

**Gate obligatorio:** no se creará ni editará SQL, no se implementará código y no se aplicará ninguna migración hasta que el usuario apruebe expresamente `plan.md` y `tasks.md`. Después de esa aprobación, cualquier inspección o aplicación de base de datos será exclusivamente contra el Supabase local aislado y con destino local confirmado. No se enlazará, inspeccionará, comparará, aplicará ni registrará nada en remoto. La aplicación remota será manual por parte del usuario y requerirá una autorización independiente.

## Estado actual inspeccionado

- Las normas aplicables son `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`, junto con `AGENTS.md`, `MEMORY.md`, la spec 004 aprobada y los contratos de la spec 003. No se crearán documentos normativos paralelos.
- La baseline representa `weekly_menus.start_date` y `end_date` como `date`, pero no exige lunes/domingo, `user_id` admite nulo y no existe unicidad por propietario/semana. `menu_items` ya limita el día a 0–6 y tiene unicidad por menú/día/tipo/orden, pero sus FK admiten nulo y el `CHECK` actual permite combinaciones ajenas a los tres huecos aprobados.
- La migración de recetas vigente cambió `menu_items.recipe_id` a `ON DELETE NO ACTION`; debe conservarse para que una receta usada no pueda borrarse. También deben conservarse la proyección pública segura de receta y el contrato `menu_items -> menu_ids` del listado de recetas.
- La baseline da acceso de lectura y escritura de `menu_items` a cualquier autenticado sin comprobar el propietario del menú. `weekly_menus` solo acredita una policy de propietario. El script histórico `scripts/fix-weekly-menus-policies.sql` añade administración sobre la cabecera, pero no forma parte del historial formal y no corrige las policies de elementos; su presencia no demuestra aplicación.
- El planificador actual decide sesión y propietario principalmente en cliente, recibe `userId` como dato de presentación y opera directamente con Supabase desde `components/weekly-menu-view.tsx`. No existe una API segura de lectura/guardado/vaciado/copia/administración para este dominio.
- El guardado actual crea la cabecera o elimina primero todos los elementos y después inserta los nuevos en operaciones separadas. Puede dejar resultados parciales, bloquea guardar un estado vacío, no elimina la cabecera al vaciar y no cierra carreras de creación del mismo propietario y semana.
- Las fechas se calculan con la zona local del proceso/navegador y conversiones ISO. La lectura prueba además el lunes solicitado y los días adyacentes, señal de representaciones históricas inconsistentes. No existe una única clasificación autoritativa en `Europe/Madrid` ni protección server-side de semanas pasadas.
- La reutilización carga otro menú directamente en memoria, pero no verifica en servidor que pertenezca al propietario objetivo. No existe baseline inmutable de destino, detección fiable de cambios pendientes ni confirmación común para cambio de semana, copia, restauración, cambio de objetivo, navegación, recarga o cierre.
- Vaciar elimina solo elementos, se deshabilita cuando la vista ya está vacía y no considera semana pasada. La marca `sacado_del_congelador` ya es booleana en `menu_items` y no está vinculada al inventario, lo que permite preservar su semántica sin tocar congeladores.
- La página dinámica es un Client Component y obtiene todas las recetas mediante la API pública. El selector y la tarjeta de hueco ya consumen nombre, calorías, imagen y alias seguro, pero el planificador conserva controles de generación aleatoria/IA y de envío por correo que están fuera de esta spec.
- Los consumidores directos adicionales son el dashboard, actividad reciente, estadísticas, historial en desarrollo y la ruta de compartir por correo. Se preservarán sus lecturas propias si el nuevo RLS las afecta; no se rediseñarán historial, IA, SMTP ni compartición.
- Las tres pruebas Jest del menú están desalineadas con el componente y con el cliente Supabase actual. Jest continúa bloqueado por la infraestructura registrada en `MEMORY.md`. El repositorio sí dispone del patrón seguro `node:test` usado por las specs recientes.
- Esta fase solo inspeccionó archivos versionados. No se ejecutaron comandos, SQL ni consultas de catálogo. El estado real local —policies, grants, FK, constraints, filas incompatibles, duplicados y migraciones aplicadas— se auditará en T1 antes de escribir SQL.

## Arquitectura mínima propuesta

### 1. Auditoría local previa y tratamiento de históricos

T1 confirmará en solo lectura y únicamente en el stack local aislado:

- columnas, tipos, defaults, nulabilidad, FK, índices, constraints, grants y RLS de `weekly_menus` y `menu_items`;
- policies/helpers vigentes de roles, proyección pública de recetas y perfiles;
- duplicados por `(user_id, start_date)`, semanas cuyo inicio no sea lunes o cuyo fin no sea el domingo correspondiente, propietarios/FK nulos, huecos duplicados o fuera de los tres válidos y recetas inexistentes;
- representación real de fechas y cualquier evidencia del desplazamiento de un día que hoy intenta compensar la UI;
- todos los consumidores y shapes, incluidos `menu_items -> menu_ids`, bloqueo de borrado de receta, dashboard y ruta de correo, sin ejecutar correo, OpenAI ni endpoints con efectos secundarios.

No se leerán ni reproducirán datos personales. Si existen incompatibilidades que impidan añadir restricciones sin pérdida, se detendrá la implementación y se propondrá una remediación explícita para aprobación; no se normalizarán, fusionarán ni borrarán silenciosamente datos históricos.

### 2. Dominio puro de semana y borrador

Crear `lib/weekly-menu/weekly-menu-domain.js` y su declaración TypeScript si la necesitan consumidores TS. Será una capa pequeña, sin red, Supabase ni reloj global, con funciones puras:

- `parseMadridDate(value)` y `mondayIsoFor(hoy)`: validan fechas civiles y obtienen el lunes en `Europe/Madrid` a partir de `hoy` explícito.
- `normalizeWeekStart(value, hoy)`: acepta una fecha civil válida y devuelve su lunes canónico, o un error tipado; nunca usa `new Date()` como reloj implícito.
- `buildWeekRange(weekStart, hoy)`: produce lunes, domingo, siete fechas e índices 0–6.
- `classifyWeek(weekStart, hoy)`: devuelve pasada, actual o futura con la semana natural de Madrid.
- `parseMenuSlot(input)` y `validateMenuDraft(input, hoy)`: permiten únicamente comida 1, comida 2 y cena 1 para días 0–6, sin huecos repetidos, con receta entera positiva y marca booleana solo en un hueco ocupado.
- `canonicalizeMenuDraft(input, hoy)` y `hasUnsavedChanges(saved, draft, hoy)`: generan una representación ordenada estable para comparar el estado guardado con el borrador.
- `copyMenuDraft(source, destinationWeek, hoy)` y `restoreMenuDraft(saved, hoy)`: copian solo recetas/marcas a huecos equivalentes o restauran el destino, sin IDs persistentes del origen.
- `canEditWeek({ actorId, actorRole, ownerId, weekStart }, hoy)`: expresa la matriz para presentación y tests; el servidor y la persistencia repiten la autorización con datos fiables.

Toda función pura que dependa de fecha u hora recibirá `hoy` como parámetro. No se añadirá una librería de fechas: `Intl` y utilidades pequeñas bastan para la única zona requerida.

### 3. Migración formal de integridad y autorización

Tras T1 y el gate, crear una única migración posterior a `20261025040000_disable_direct_recipe_image_updates.sql`, sin modificar baseline, migraciones aplicadas ni `scripts/fix-weekly-menus-policies.sql`. Si T1 contradice este diseño, se actualizarán y aprobarán de nuevo plan y tareas antes de escribir SQL.

La migración deberá:

- formalizar `start_date` como el lunes civil canónico almacenado en `date`, exigir `end_date = start_date + 6`, propietario no nulo y unicidad `(user_id, start_date)`; no se añadirá una columna de timestamp ni se convertirá la semana a UTC;
- exigir FK no nulas para menú y receta, conservar la FK restrictiva de receta y el cascade de cabecera a elementos, mantener unicidad de hueco y restringir exactamente a día 0–6 con `(comida, 1)`, `(comida, 2)` o `(cena, 1)`;
- sustituir policies y grants amplios de ambas tablas por acceso autenticado propio y acceso administrativo global, incluyendo lectura de pasado pero escritura solo de semana actual/futura según `Europe/Madrid`;
- usar el helper administrativo vigente cuando sea adecuado, con `search_path` fijo y mínimo privilegio; no usar `service-role` ni conceder acceso anónimo;
- añadir una referencia opaca específica del planificador para cada perfil y una frontera admin que devuelva únicamente esa referencia y una etiqueta pública segura. Alias iguales o ausentes se desambiguarán con un fragmento no personal de esa referencia; no se expondrán UUID internos, email, teléfono, nombres, avatar ni perfil completo;
- añadir funciones transaccionales acotadas para guardar/reemplazar y vaciar. Resolverán el propietario desde la sesión o la referencia opaca, volverán a comprobar rol y semana, validarán todos los huecos y recetas antes de mutar y tratarán el array vacío como borrado de elementos y cabecera o como no-op si no existe;
- garantizar que una receta seleccionada existe en la proyección pública vigente, sin exigir autoría, y mantener el bloqueo de borrado de recetas referenciadas;
- devolver errores estables sin revelar si un recurso ajeno existe. Las funciones no confiarán en identidad, rol, fecha actual ni autorización enviados por el navegador.

La migración incluirá precondiciones explícitas para históricos incompatibles y abortará sin cambios si los encuentra. Será repetible respecto a objetos nominales que gestione, pero no se prometerá idempotencia por reejecución manual.

### 4. Frontera server-side y contratos HTTP

Crear `lib/weekly-menu/weekly-menu-server-operations.js` para centralizar sesión SSR, rol, resolución del propietario objetivo, fecha autoritativa, llamadas transaccionales y DTOs. Los Route Handlers usarán el cliente SSR de cookies y RLS, nunca service-role.

Contratos mínimos:

- `GET /api/weekly-menu?week=YYYY-MM-DD&target=<ref opcional>`: devuelve el destino autorizado, sus 21 huecos conceptuales, estado guardado, editabilidad y recetas mediante el DTO público seguro.
- `PUT /api/weekly-menu`: valida semana/objetivo/borrador y guarda atómicamente. Un borrador vacío elimina el menú o no crea nada. Solo comunica éxito tras releer el resultado persistido.
- `DELETE /api/weekly-menu`: ejecuta el vaciado inmediato confirmado por la UI; no acepta semanas pasadas y deja el destino sin cabecera ni elementos.
- `GET /api/weekly-menu/sources?target=<ref opcional>`: lista semanas guardadas accesibles del mismo propietario objetivo mediante fecha y etiqueta, sin constituir un historial general.
- `POST /api/weekly-menu/copy`: valida origen y propietario objetivo y devuelve una instantánea copiable; no escribe el destino ni modifica el origen.
- `GET /api/weekly-menu/admin-targets`: solo para admin, devuelve referencia opaca y etiqueta segura mínima. Un no admin obtiene denegación uniforme.

Los errores públicos estarán en español y distinguirán entrada inválida, autenticación, operación no permitida y fallo interno sin filtrar SQL ni existencia ajena. Las operaciones admitirán `user_restricted`, `user_full` y `admin` para menús propios; la referencia de objetivo no será autoridad por sí misma.

### 5. Página y estado cliente con guardado explícito

Convertir `app/weekly-menu/[week]/page.tsx` en frontera de servidor para validar sesión y parámetro semanal antes de renderizar el planificador. `app/weekly-menu/page.tsx` usará la misma utilidad de Madrid para redirigir al lunes actual. No se mantendrá una comprobación de autenticación exclusivamente cliente.

Adaptar `components/weekly-menu-view.tsx` sin crear un planificador paralelo:

- representar siempre 7 días × 3 huecos fijos y separar `savedSnapshot` de `draft`;
- cargar y guardar solo mediante los contratos server-side; no enviar `userId`, rol ni UUID propietario como autorización ni escribir directamente en las tablas;
- permitir selección de cualquier receta pública y mostrar exclusivamente su DTO seguro;
- habilitar edición, marca de congelador, copia, restauración, guardado y vaciado solo para semana actual/futura; el pasado se mostrará íntegramente en solo lectura;
- habilitar Guardar también con cero huecos cuando el borrador difiera del estado guardado; tras éxito, reemplazar el baseline. Vaciar será otra acción, inmediata tras confirmación, y permanecerá deshabilitada en pasado;
- copiar en memoria, conservar inmutable el origen y persistir únicamente el destino al pulsar Guardar; Restaurar recuperará el último snapshot guardado del destino;
- para admin, mostrar el selector mínimo de objetivo y no exponer datos adicionales. Cambiar objetivo volverá a cargar recetas/menú solo tras resolver cambios pendientes;
- mantener la marca de congelador como booleano del elemento, sin llamadas ni dependencias del inventario y sin fecha.

Se reutilizarán `RecipeSelector`, `ConfirmationDialog` y componentes UI existentes cuando encajen. La generación automática/aleatoria, OpenAI, el envío/compartición por correo y el historial general no se ampliarán ni se probarán en esta spec; sus rutas e integraciones no se modificarán. Si un control heredado permanece visible, no podrá eludir solo lectura ni la protección de borrador y no aparecerá para un menú ajeno administrado si depende del propietario de sesión.

### 6. Protección uniforme de cambios pendientes

Crear un hook acotado, por ejemplo `hooks/use-unsaved-menu-guard.ts`, apoyado por decisiones puras testeables. Una única función de confirmación protegerá:

- cambio de semana;
- carga de una copia y restauración;
- cambio de objetivo administrativo;
- enlaces y navegación de ruta controlable por la aplicación;
- atrás/adelante cuando el navegador permita interceptarlo;
- `beforeunload` para recarga o cierre con el diálogo nativo disponible.

Cancelar conservará objetivo, semana y borrador. Confirmar descartará solo el borrador y continuará la acción. Guardar o vaciar con éxito desactivará el guard. No se prometerá texto personalizado ni interceptación que el navegador no permita.

## Archivos previstos y trazabilidad

| Parte / archivos previstos | Responsabilidad | RF |
|---|---|---|
| `supabase/migrations/<nueva>_secure_weekly_menus.sql` | Unicidad, fechas, huecos, FK, RLS, referencia admin y RPCs atómicas | RF-1–RF-9, RF-11–RF-16, RF-22–RF-30 |
| `lib/weekly-menu/weekly-menu-domain.js` y `.d.ts` | Fechas Madrid con `hoy`, slots, borrador, copia, restauración y dirty state | RF-5–RF-13, RF-17–RF-26, RF-30 |
| `lib/weekly-menu/weekly-menu-server-operations.js` y `.d.ts` si hace falta | Sesión, rol, propietario, DTO seguro, lectura y mutaciones | RF-1–RF-4, RF-7–RF-19, RF-22–RF-30 |
| `app/api/weekly-menu/route.ts` | Lectura, guardado explícito y vaciado inmediato | RF-1–RF-17, RF-22–RF-26, RF-29–RF-30 |
| `app/api/weekly-menu/sources/route.ts`, `app/api/weekly-menu/copy/route.ts` | Orígenes accesibles y copia solo en memoria | RF-18–RF-21, RF-29 |
| `app/api/weekly-menu/admin-targets/route.ts` | Selección administrativa mínima y opaca | RF-3–RF-4, RF-20–RF-21, RF-27, RF-29 |
| `app/weekly-menu/page.tsx`, `app/weekly-menu/[week]/page.tsx` | Entrada SSR autenticada y semana canónica | RF-1–RF-6, RF-11–RF-12 |
| `components/weekly-menu-view.tsx`, `components/recipe-selector.tsx` solo si su contrato lo exige | 21 huecos, lectura/edición, recetas públicas, guardar/vaciar/copiar/restaurar/admin | RF-2–RF-3, RF-8–RF-15, RF-17–RF-28 |
| `hooks/use-unsaved-menu-guard.ts` | Confirmación uniforme de salidas y aviso nativo | RF-20–RF-21 |
| Consumidores semanales de dashboard/tipos, solo si T1 confirma impacto | Preservar contratos vigentes sin crear historial | RF-7, RF-10, RF-28 |
| Tests `node:test` bajo `tests/unit/lib/`, `tests/unit/api/`, `tests/unit/components/` y `tests/migrations/` | Evidencia TDD sin red ni reloj global | RF-1–RF-30 |
| `docs/ARCHITECTURE.md`, `docs/AUTH.md`, `docs/DATABASE.md` | Solo al implementar y solo para reflejar el estado estable | RF-4–RF-8, RF-27–RF-30 |

Los nombres finales pueden ajustarse en T1 para reutilizar utilidades existentes, pero no se crearán capas o rutas duplicadas. No se tocarán `app/api/generate-menu/route.ts`, `app/api/weekly-menu/share/route.ts`, SMTP, cron, Vercel ni congeladores.

## Decisiones y alternativas descartadas

- **Fecha civil lunes en `date` + cálculo Madrid:** se conserva `start_date` como fecha civil canónica y se deriva el domingo. Se descarta almacenar la semana como timestamp UTC o probar días adyacentes, porque una semana no es un instante y esa estrategia causa desplazamientos.
- **`hoy` inyectado en dominio:** se descarta leer el reloj dentro de funciones puras. La capa server obtiene el instante de la petición y persistencia vuelve a evaluar el límite en Madrid para impedir falsificación.
- **API SSR + RLS + RPC transaccional:** se descartan escrituras directas desde el navegador y service-role. La sesión de cookies, las comprobaciones explícitas y RLS forman una defensa conjunta.
- **Reemplazo atómico en persistencia:** se descarta borrar e insertar desde varias llamadas HTTP. Una única transacción valida primero y sustituye después, por lo que un fallo no deja una mezcla parcial.
- **Unicidad persistente propietario/semana:** se descarta resolver duplicados con `maybeSingle`, orden o lógica cliente. El índice/constraint cierra también carreras.
- **Array vacío como borrado:** se descarta bloquear Guardar vacío o conservar una cabecera sin elementos. La acción Vaciar usa la misma semántica persistente, pero conserva su confirmación y ejecución inmediata separadas.
- **Copia como lectura de snapshot:** se descarta clonar filas o crear el destino al seleccionar origen. Solo el borrador recibe los huecos; origen y destino persistente permanecen intactos hasta Guardar.
- **Baseline guardado + borrador canónico:** se descarta usar un booleano marcado manualmente, porque puede quedar desincronizado al deshacer cambios. La comparación estable incluye receta y marca por hueco.
- **Referencia administrativa dedicada:** se descarta enviar UUID de usuario, email o datos de perfil, y también mantener mapas efímeros en memoria del servidor. Una referencia aleatoria estable, privada salvo para admin y resoluble server-side soporta múltiples instancias sin PII.
- **Proyección pública de recetas existente:** se descarta consultar perfiles completos o exigir recetas propias. Se reutiliza el contrato seguro de spec 003 y se conserva la FK restrictiva.
- **Sin dependencia nueva:** se descarta incorporar una librería de fechas o estado para un dominio limitado a una zona y 21 huecos.
- **Cambios local-first:** se descartan `link`, destinos linked, `--db-url`, push/repair remoto y cualquier supuesto sobre producción. El usuario aplicará manualmente el cambio remoto después de validarlo y autorizarlo aparte.
- **Fuera de alcance intacto:** se descarta aprovechar la refactorización para rediseñar generación IA/aleatoria, correo, enlaces compartidos o historial general.

## Estrategia TDD y validación

Cada tarea de implementación será asumida por un único implementador, empezará con un test focal que falle por el comportamiento ausente, incorporará el cambio mínimo y dejará verde el test focal y el gate general antes de entregar a la tarea siguiente. No habrá implementaciones paralelas sobre los mismos contratos.

Los tests nuevos serán `.test.js` con `node:test`, dobles inyectados y `hoy` explícito, sin red, credenciales, reloj global, email, OpenAI ni dependencias nuevas. Cobertura mínima:

- dominio: fecha inválida, lunes/domingo, cruces de mes/año, domingo, DST de Madrid, actual/pasada/futura, 21 huecos, combinaciones inválidas, duplicados, canonicalización, dirty state, copia y restauración;
- autorización: anónimo, `user_restricted`, `user_full`, admin propio/ajeno, no admin con referencia ajena, rol/sesión cambiados y errores no enumerables;
- persistencia: duplicados históricos detectados, unicidad concurrente, fechas lunes/domingo, FK no nulas/restrictiva, slots exactos, RLS, receta pública propia/ajena, guardado atómico, vacío y vaciado;
- APIs: lectura vacía, guardado y relectura, fallo sin éxito parcial, DELETE inmediato, pasado denegado, copia sin escritura, origen intacto y targets admin sin PII/IDs;
- UI/presentación: 21 huecos, pasado deshabilitado, Guardar vacío cuando hay cambios, confirmación de Vaciar, marca booleana, copia/restauración, target admin y confirmaciones de todas las salidas;
- regresión: `menu_items -> menu_ids`, bloqueo de borrado de receta usada, DTO público seguro y consumidores semanales afectados.

Tras cada tarea, el coordinador ejecutará los tests focales y `node --test` como gate seguro. Jest no será gate mientras persistan `jest-environment-jsdom` ausente, `moduleNameMapping` inválido y scripts inexistentes; las pruebas Jest heredadas se registrarán como deuda y no se afirmará que pasan.

La migración se previsualizará y aplicará una vez solo en el stack local aislado confirmado. Se validarán catálogo, preservación de filas, precondiciones, matriz RLS/RPC, concurrencia y un segundo dry-run local sin pendientes. Se usarán únicamente fixtures sintéticos y se limpiarán; no se consultará ni tocará remoto.

Al cierre:

1. tests focales y `node --test` general;
2. `npx tsc --noEmit`, separando deuda preexistente;
3. `npm run lint`;
4. `npm run build`, porque cambian rutas, RSC, Client Components y APIs;
5. demostración local de actores, tiempo Madrid, guardado/vaciado/copia/restauración y protección de salidas, sin email, IA ni servicios remotos;
6. `git diff --check` y revisión de secretos, alcance y trazabilidad RF-1–RF-30.

No se ejecuta ningún comando en esta fase de planificación y no se afirmará una validación sin haberla ejecutado durante implementación.

## Riesgos y controles

- **Datos históricos incompatibles:** constraints nuevas pueden fallar. T1 mide solo agregados y la migración aborta con diagnóstico; cualquier saneamiento vuelve a aprobación.
- **Estado remoto desconocido:** historial y scripts no acreditan producción. La entrega separa archivo versionado, validación local y aplicación manual remota.
- **Zona horaria y DST:** mezclar `Date`, UTC y fecha civil puede desplazar el lunes. El dominio usa `Europe/Madrid`, entradas civiles estrictas y `hoy` inyectado; persistencia repite la regla.
- **Carreras de guardado:** dos creaciones o sustituciones simultáneas pueden competir. La unicidad y la transacción garantizan un único menú y un conjunto coherente; un conflicto nunca se presenta como éxito falso.
- **Admin y privacidad:** listar perfiles completos filtraría PII. La referencia dedicada y etiqueta segura se prueban por allowlist y ausencia de campos prohibidos.
- **RLS de elementos:** las policies actuales permiten acceso cruzado. Se sustituyen conjuntamente con cabeceras y se prueba cada operación directa y RPC, sin service-role.
- **Contratos de recetas:** endurecer `menu_items` puede romper borrado o `menu_ids`. Se conserva `ON DELETE NO ACTION`, se prueba la regresión y no se cambia el DTO público.
- **Navegación del navegador:** `beforeunload` y atrás/adelante tienen límites de plataforma. Se cubren acciones controlables y se usa aviso nativo sin prometer texto personalizado.
- **Componente actual extenso:** existe riesgo de mezclar generación/compartición fuera de alcance. Se extrae solo dominio/guard y se limita el diff al flujo manual aprobado.
- **Consumidores heredados:** dashboard y correo consultan tablas directamente. T1 identifica los afectados por RLS; solo se hacen adaptaciones de compatibilidad imprescindibles, sin ampliar esas features.

## Impactos declarados

- **Supabase / base de datos:** sí; una migración formal con constraints, índice único, RLS/grants, referencia admin y RPCs.
- **Autenticación / autorización:** sí; sesión SSR, propiedad propia para todos los roles y administración global con límites temporales.
- **APIs y UI:** sí; lectura, guardado, vaciado, copia, selector admin y protección de borrador.
- **Recetas:** se reutiliza su proyección pública y se preservan `menu_items -> menu_ids` y borrado restrictivo; no se cambia su modelo funcional.
- **Congeladores:** no; la marca solo persiste un booleano en `menu_items`.
- **Variables de entorno y dependencias:** no se añaden ni cambian.
- **OpenAI, SMTP, email, historial general, Vercel y cron:** sin impacto funcional; no se ejecutan ni modifican.
- **Remoto:** no; la aplicación final queda como paso manual del usuario bajo autorización independiente.
