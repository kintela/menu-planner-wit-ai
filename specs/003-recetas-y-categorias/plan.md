# Plan — Recetas y categorías

## Estado y gate de aprobación

La spec RF-1–RF-29 y este plan fueron aprobados explícitamente. El plan está **implementado**, incluidas las rondas de correcciones de revisión documentadas en T11 y T12.

**Gate superado:** tras la aprobación, toda inspección y aplicación de base de datos se realizó exclusivamente contra el Supabase local aislado y con destino local confirmado. No se enlazó, inspeccionó, comparó, aplicó ni registró nada en remoto; cualquier actuación remota será manual por parte del usuario y requerirá una autorización independiente.

## Estado actual inspeccionado

- Los documentos de proyecto aplicables son `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`, junto con las instrucciones operativas de `AGENTS.md` y el estado y las decisiones vigentes de `MEMORY.md`, según corresponda. No se crearán documentos normativos paralelos.
- La baseline acredita `recipes`, `categories`, `recipe_categories`, `recipe_ratings` y `menu_items`. Ya existen la clave compuesta de asociaciones, la unicidad de valoración por receta/usuario y el `CHECK` 1–5, pero las policies permiten a cualquier autenticado modificar recetas y categorías; `recipe_ratings` tiene RLS sin policies acreditadas. La FK `menu_items.recipe_id` usa borrado en cascada, contrario al bloqueo requerido.
- La migración de perfil vigente restringe `user_profiles` al propietario. Por tanto, la proyección pública de alias no puede reabrir el perfil completo: necesita una frontera mínima que devuelva exclusivamente alias normalizado o `Usuario`.
- El listado SSR consulta perfiles con IDs y nombres personales, consulta `menu_items` y transforma `menu_items -> menu_ids`. El detalle consulta por separado `full_name`. Ambos incumplen la proyección pública mínima. La UI usa `user_id` para decidir acciones; esas decisiones no son autorización.
- La creación y edición usan service-role o identidad de cabecera/cuerpo. El borrado admite ausencia de identidad y `force=true`, elimina referencias de menú y deduce ownership de Storage a partir de una URL. La comprobación de menús falla abierta en algunos caminos.
- Categorías se gestionan directamente desde el navegador. La UI permite crear, editar, eliminar y fusionar sin una frontera autoritativa; la fusión es iterativa y no atómica. La baseline no impide nombres equivalentes por mayúsculas/minúsculas y espacios.
- Las valoraciones se leen y escriben directamente desde el navegador; la autoevaluación solo se evita en UI y no existe retirada. Los agregados públicos exigen no revelar filas ni identidades individuales.
- `recipe-images` se crea o hace público durante una petición con service-role. La subida no autentica ni acredita receta, el cliente puede borrar objetos por URL y el reemplazo borra antes de asociar. La baseline y migraciones actuales no acreditan bucket, metadata ni policies para imágenes de recetas.
- Los tests Jest de recetas/categorías están desalineados con exportaciones y contratos actuales, y la infraestructura Jest sigue bloqueada. Sí existe una suite segura basada en `node:test` para trabajo reciente. No se ejecutó ningún comando ni se consultó un entorno durante esta fase.

## Arquitectura mínima propuesta

### 1. Dominio puro y frontera única de confianza

Crear `lib/recipes/recipe-domain.js` y su declaración TypeScript solo si es necesaria para los consumidores TS. Contendrá funciones puras, sin red, Supabase ni reloj global:

- `parseRecipeId(value)` y `parseCategoryId(value)`: aceptan únicamente identificadores enteros positivos.
- `normalizeCategoryName(value)`: aplica trim y una clave de comparación sin distinción de mayúsculas/minúsculas.
- `buildRecipeMutation(input, actorId, hoy)`: aplica allowlist y normalización de campos; ignora propietario, timestamps y campos internos aportados por el cliente. Si genera una fecha, usa exclusivamente `hoy`.
- `canManageRecipe({ actorId, actorRole, ownerId })`: expresa propietario o administrador para presentación y para probar la matriz; el servidor vuelve a comprobarlo con datos persistentes.
- `validateRating(value)`: acepta solo enteros 1–5.
- `buildManagedRecipeImagePath(recipeId, fileName, hoy)`: crea una ruta canónica bajo la receta; cualquier componente temporal recibe `hoy` como parámetro.
- `classifyImageTransition(previous, next, outcome)`: distingue éxito, fallo y limpieza parcial sin afirmar reversiones inexistentes.
- `toPublicRecipe(row)`: produce el DTO público con alias/`Usuario` y agregados, excluyendo IDs de usuario/perfil y todos los campos personales prohibidos.

No se añadirá una capa general ni una dependencia nueva. Toda función futura que dependa de la fecha recibirá `hoy` explícitamente; no usará `Date.now()` ni `new Date()` dentro del dominio.

### 2. Una migración formal posterior a las actuales

Tras el gate y la auditoría local de T1, crear una única migración ordenada en `supabase/migrations/<versión>_secure_recipes_categories_ratings_images.sql`; no modificar baseline ni migraciones existentes. Si T1 descubre una incompatibilidad que cambie este diseño, detenerse y actualizar/aprobar el plan antes de escribir SQL.

La migración mínima deberá preservar filas y asociaciones existentes y cubrir:

- un helper de autorización SQL con `search_path` fijo que determine el rol del usuario actual sin hacer público `user_profiles`;
- policies y grants de `recipes` para lectura pública de los campos de receta, inserción con `user_id = auth.uid()` y actualización/borrado solo por propietario o admin; el servidor seguirá realizando autorización explícita;
- una función/proyección pública con permisos mínimos para listado y detalle que una receta, categorías, alias seguro y agregados, sin exponer `user_id`, ID de perfil, datos personales ni filas individuales de valoraciones; se revocará la vía anónima que actualmente permite leer directamente esos identificadores de `recipes`;
- lectura pública de categorías y creación por cualquier autenticado; edición/borrado/fusión solo admin; comprobación autoritativa y resistente a concurrencia del nombre normalizado, conservando duplicados históricos hasta que un admin los fusione explícitamente;
- policies de `recipe_categories` que permitan lectura requerida y cambios únicamente al gestionar una receta; la fusión admin se hará en una función transaccional que inserte asociaciones faltantes, elimine duplicados/origen y solo entonces elimine la categoría fuente;
- policies de `recipe_ratings` para alta/actualización/borrado de la propia valoración sobre receta ajena, junto con la restricción persistente de autoevaluación y las restricciones 1–5/unicidad ya existentes; el público solo accederá al agregado y un autenticado a su propia valoración mediante contratos acotados;
- sustitución de la FK `menu_items.recipe_id` en cascada por una FK restrictiva equivalente, sin tocar filas, de forma que una carrera o fallo en la precomprobación no pueda borrar referencias ni receta;
- configuración declarativa del bucket `recipe-images` para lectura pública y escrituras autenticadas acotadas a una receta gestionable; metadata privada que acredite la única imagen gestionada vigente (`recipe_id` y ruta canónica) sin inferir ownership desde la URL; policies de Storage y metadata para propietario/admin;
- revocación de grants/policies amplios incompatibles, sin añadir service-role a la feature, sin borrar imágenes históricas y sin convertir URLs externas en objetos gestionados.

La migración será repetible respecto a objetos nominales que gestione, pero no se prometerá idempotencia mediante reejecución manual del archivo. Los duplicados históricos de categorías, URLs históricas y objetos no acreditables se conservarán. La fusión posterior será la única vía funcional para consolidar categorías existentes.

### 3. Lectura pública segura

Mantener el listado y detalle como carga de servidor y centralizar el shape en `lib/recipes/recipe-server-operations.js`. Adaptar:

- `app/recipes/page.tsx` para obtener el DTO público seguro y, si existe sesión, añadir únicamente metadata de capacidad (`can_edit`, `can_delete`, `my_rating` y datos de filtro admin estrictamente necesarios). No entregar IDs internos de autor al visitante.
- `app/recipes/[id]/page.tsx` para cargar receta, categorías, alias seguro y agregado sin leer el perfil privado completo.
- `app/api/recipes/route.ts` (`GET`) y `app/api/recipes/[id]/route.ts` (`GET`) como contratos públicos equivalentes para consumidores cliente.
- `app/api/categories/route.ts` (`GET`) como lectura pública sin service-role.
- `app/sitemap.ts`, `app/recipes/search/page.tsx`, `app/recipes/new/page.tsx` y cualquier consumidor anónimo confirmado por T1 para que no dependa del `SELECT` público directo que exponía `user_id`.

El contrato `menu_items -> menu_ids` de `app/recipes/page.tsx` se conservará exactamente para consumidores autenticados. La consulta se hará con la sesión y solo para referencias visibles por esa sesión; el DTO anónimo no expondrá IDs de menús. No se modifica, elimina ni crea ningún menú.

### 4. Escrituras de recetas y bloqueo de borrado

Rehacer `POST /api/recipes` y `PUT`/`DELETE /api/recipes/[id]` sobre el cliente SSR de la sesión, sin aceptar `user_id`, `x-user-id`, bearer artesanal ni service-role como autoridad. Las rutas validarán cuerpo acotado, sesión, rol y propiedad con datos persistentes, y devolverán errores públicos en español.

- Crear asignará siempre `auth.getUser().id`, admitirá `user_restricted`, `user_full` y admin, y asociará categorías válidas sin duplicados.
- Editar será propietario/admin y actualizará receta y conjunto de categorías como una operación coherente; una categoría inexistente o un fallo de asociación no se declarará éxito completo.
- Eliminar será propietario/admin, fallará cerrado si no puede comprobar menús, no admitirá `force`, y dependerá también de la FK restrictiva. Tras confirmar el borrado, podrá limpiar únicamente la imagen gestionada acreditada; categorías/valoraciones podrán seguir su cascade actual.
- `app/api/recipes/[id]/check-menu-usage/route.ts` dejará de confiar en cabeceras cliente y compartirá la misma operación server-side. Es informativa para UX; la seguridad definitiva permanece en `DELETE` y la FK.

Se conservará el contrato de respuesta que aún usen los formularios cuando no contradiga la spec. El envío SMTP existente al crear receta no se ampliará ni se usará como prueba: se desacoplará de la autorización y se simulará/desactivará en tests para no enviar correo real. No se cambia configuración SMTP.

### 5. Categorías globales

Ampliar `app/api/categories/route.ts` con `POST`; añadir `app/api/categories/[id]/route.ts` para `PUT`/`DELETE` y `app/api/categories/merge/route.ts` para la fusión. Todas usan sesión SSR y la función transaccional persistente donde corresponda.

`POST` admite cualquier rol autenticado y aplica trim/duplicado normalizado. `PUT`, `DELETE` y merge exigen admin en servidor. El borrado comprueba autoritativamente que no haya asociaciones y falla ante error o carrera. La fusión exige origen/destino existentes y distintos y se confirma solo después de transferir sin duplicados y eliminar el origen.

### 6. Valoraciones y agregados

Añadir `app/api/recipes/[id]/rating/route.ts`:

- `GET` devuelve agregado público y, solo con sesión, la valoración propia; nunca identidades de terceros.
- `PUT` realiza upsert de la única valoración propia después de validar entero 1–5 y que no sea la receta propia.
- `DELETE` retira únicamente la valoración de la sesión.

La capa persistente repite rango, unicidad, ownership de valoración y veto de autoevaluación. Los agregados se calculan en servidor/persistencia y se devuelven como media y recuento; sin votos se devuelve recuento cero y estado sin valoraciones.

### 7. Ciclo de vida de imágenes

Añadir `app/api/recipes/[id]/image/route.ts` para `POST` (subir/reemplazar) y `DELETE` (retirar), y convertir `app/api/upload-image/route.ts` en una respuesta cerrada sin acceso a Storage cuando sus consumidores hayan migrado. No se listarán buckets ni se cambiará su configuración durante peticiones.

- La ruta deriva sesión y comprueba propietario/admin sobre la receta antes de tocar Storage.
- La ruta canónica se construye en servidor con `hoy`; la URL del cliente nunca acredita ownership. Se conservan validaciones visibles de tipo/tamaño y se acota el multipart.
- Reemplazo: subir objeto nuevo, asociar URL y metadata a la receta y solo entonces intentar borrar la ruta gestionada anterior acreditada. Si falla la asociación, la anterior sigue vigente y se intenta compensar el objeto nuevo; si esa limpieza falla, se informa residuo. Si falla la limpieza posterior, la asociación nueva permanece y se informa resultado parcial.
- Retirada: quitar primero URL/metadata de la receta y después intentar borrar solo el objeto acreditado. Una URL externa se desasocia sin acceso destructivo a su origen.
- Borrado de receta: capturar previamente metadata acreditada, confirmar el borrado de la fila sin referencias de menú y después intentar limpiar el objeto. Un fallo final se comunica como parcial; no se restaura ni se declara éxito total.

No se borrarán objetos históricos sin metadata inequívoca ni se realizará saneamiento masivo.

### 8. UI y contratos

Adaptar únicamente los consumidores de esta feature:

- `components/recipes-page-client.tsx`, `components/recipe-card.tsx` y `app/recipes/[id]/RecipeClientPage.tsx`: visitante de solo lectura, alias exacto/`Usuario`, agregados públicos y acciones según capacidades del servidor; sin nombres completos ni IDs de autor.
- `app/recipes/add/page.tsx`, `components/add-recipe-form.tsx`, `app/recipes/[id]/edit/page.tsx`, `components/edit-recipe-form.tsx` y `components/delete-recipe-button.tsx`: APIs protegidas, admin incluido, `user_restricted` admitido, sin IDs/cabeceras de autorización cliente, sin borrado forzado y con fallos parciales de imagen veraces.
- `app/categories/page.tsx`, `components/category-manager.tsx` y `components/category-selector.tsx`: lectura pública, creación para todo autenticado y controles de edición/borrado/fusión solo admin; ninguna escritura directa a Supabase desde navegador.
- `components/star-rating.tsx`: agregado visible sin sesión, upsert/retirada autenticados y veto de receta propia decidido por servidor.
- `lib/types.ts` o tipos locales: DTO público separado de metadata autenticada; conservar campos existentes y `menu_ids` sin propagar datos privados.

Los helpers duplicados de permisos solo se tocarán si un consumidor actual depende de ellos para mostrar que `user_restricted` no puede crear recetas/categorías. En ese caso se sincronizarán `lib/auth.ts` y `lib/auth-client.ts` con el mínimo cambio, sin usar esos helpers como autorización real.

## Archivos previstos y trazabilidad

| Parte / archivos previstos | Responsabilidad | RF |
|---|---|---|
| `supabase/migrations/<nueva>_secure_recipes_categories_ratings_images.sql` | RLS/grants, proyección pública, integridad de categorías/ratings, FK restrictiva, bucket/metadata/policies | RF-1–RF-2, RF-5–RF-26, RF-28–RF-29 |
| `lib/recipes/recipe-domain.js` y declaración TS si hace falta | Validación, normalización, DTO público, permisos de presentación y paths con `hoy` | RF-3–RF-19, RF-22–RF-29 |
| `lib/recipes/recipe-server-operations.js` | Sesión, consultas mínimas, autorización persistente y resultados parciales | RF-1–RF-29 |
| `app/api/recipes/route.ts`, `app/api/recipes/[id]/route.ts`, `app/api/recipes/[id]/check-menu-usage/route.ts` | Lectura pública y CRUD protegido sin identidad cliente ni force | RF-1–RF-8, RF-11, RF-20–RF-21, RF-26–RF-29 |
| APIs de categorías bajo `app/api/categories/` | Crear, editar, borrar y fusionar con permisos/atomicidad | RF-9–RF-15 |
| `app/api/recipes/[id]/rating/route.ts` | Agregado, valoración propia, upsert y retirada | RF-16–RF-19 |
| `app/api/recipes/[id]/image/route.ts`, `app/api/upload-image/route.ts` | Ciclo seguro y cierre del bypass genérico | RF-22–RF-27 |
| Páginas/componentes de recetas y `lib/types.ts` | Lectura pública, filtros, acciones autorizadas, alias seguro, rating e imagen | RF-1–RF-8, RF-16–RF-29 |
| Páginas/componentes de categorías | Catálogo público y gestión según rol | RF-9–RF-15 |
| `app/sitemap.ts` y consumidores anónimos confirmados en T1 | Compatibilidad con la nueva proyección pública | RF-1–RF-3, RF-28–RF-29 |
| `tests/unit/lib/recipes-*.test.js`, `tests/unit/api/recipes-*.test.js`, `tests/migrations/secure-recipes-*.test.js` | Evidencia TDD ejecutable con `node --test` | RF-1–RF-29 |
| `docs/ARCHITECTURE.md`, `docs/AUTH.md`, `docs/DATABASE.md` | Solo al implementar y solo si la arquitectura estable cambia; no crear otra norma | RF-8, RF-21–RF-29 |

Los nombres finales pueden ajustarse para reutilizar una utilidad existente descubierta en T1, pero no se crearán rutas o capas paralelas. Cualquier cambio de alcance exige volver a la spec.

## Decisiones y alternativas descartadas

- **Cliente SSR de sesión + RLS y checks explícitos:** se descarta service-role para CRUD/Storage y la identidad en cuerpo/cabeceras, porque omiten la sesión y contradicen RF-5–RF-8.
- **Proyección pública mínima:** se descarta reabrir `user_profiles`, exponer `user_id` o usar nombre/email como fallback. Un RPC/proyección acotado resuelve el conflicto con la spec owner-only de perfil sin publicar el perfil.
- **DTO público y capacidades:** se descarta entregar IDs de autor para que el navegador calcule permisos. El servidor devuelve alias y capacidades; la autorización se repite en cada escritura.
- **Una migración cohesionada:** se elige un cambio formal posterior a baseline para políticas, funciones, FK y Storage que deben ser consistentes. Se descarta editar baseline o scripts históricos. Si la auditoría demuestra que no puede aplicarse de forma segura como una unidad, se actualizará el plan antes de dividirla.
- **Duplicados históricos conservados:** se descarta borrarlos o fusionarlos automáticamente. La creación/edición nueva se serializa por nombre normalizado y la fusión explícita admin consolida asociaciones.
- **Fusión transaccional en persistencia:** se descarta el bucle cliente, porque puede dejar asociaciones parciales y perder la fuente.
- **FK restrictiva más precheck:** se descarta confiar solo en UI/API y se elimina el force-delete. La FK cierra carreras y garantiza que ningún menú se borra en cascada.
- **Agregados sin filas públicas:** se descarta dar `SELECT` público a `recipe_ratings`, porque revelaría usuarios aunque la UI no los mostrase.
- **Metadata de imagen:** se descarta inferir un objeto gestionado por dominio, bucket o URL. Solo metadata vinculada a receta permite borrarlo; lo histórico no acreditable se conserva.
- **Orden subir → asociar → limpiar:** se descarta borrar primero. Storage y Postgres no comparten transacción, por lo que se modelan compensación y éxito parcial.
- **Bucket declarado por migración:** se descarta crearlo/listarlo/hacerlo público durante una petición. La lectura será pública y las escrituras owner/admin mediante políticas.
- **Cambios local-first:** se descartan `link`, destinos linked, `--db-url`, push/repair remoto y cualquier supuesto sobre producción. La aplicación remota será manual del usuario.

## Estrategia TDD y validación

Cada tarea de implementación empieza con un test focal que falle por el comportamiento ausente, incorpora el cambio mínimo y deja verde el test focal y el gate general. Los tests nuevos serán `.test.js` con `node:test` y dobles inyectados, sin red, credenciales, reloj global, correo real ni nuevas dependencias.

Cobertura mínima:

- dominio: IDs, allowlists, `hoy`, categoría normalizada, rating 1–5, DTO sin PII/IDs y path gestionado;
- rutas: anon, `user_restricted`, `user_full`, propietario, ajeno y admin; identidad falsa en cuerpo/cabecera; errores públicos; fail-closed;
- categorías: concurrencia/duplicado normalizado, categoría no vacía, merge diferente/atómico/sin duplicados;
- ratings: alta, actualización, retirada, concurrencia, receta propia y agregado cero;
- menús: referencia única/múltiple, error de comprobación y carrera bloqueada por FK; preservación de `menu_items -> menu_ids`;
- imágenes: externa, histórica no acreditable, objeto ajeno, carga/asociación/limpieza y todos los fallos parciales de RF-27;
- privacidad: listado, detalle, API y props de UI no contienen IDs de autor, email, nombres, teléfono ni avatar.

Tras cada tarea, el coordinador ejecutará `node --test` como gate seguro y se detendrá ante fallo. Jest no será un gate hasta resolver su infraestructura fuera de esta spec. Para la migración, además se hará dry-run explícitamente local, aplicación al stack aislado, validación de catálogo y matriz anon/roles/owner/other/admin, preservación de datos y segundo dry-run sin pendientes; nunca se reejecutará SQL manualmente ni se tocará remoto.

Al cierre:

1. `node --test` focal y general;
2. `npx tsc --noEmit`, registrando por separado los bloqueos preexistentes;
3. `npm run lint`;
4. `npm run build`, porque cambian rutas, RSC/Client Components, APIs y acceso a datos;
5. demostración local de listado/detalle público, roles, categorías, ratings, bloqueo por menús e imágenes, sin correo real ni operaciones remotas.

No se afirmará que una validación pasa sin ejecutarla. No se usará la ruta cron, OpenAI ni Vercel; no se cambian sus archivos, configuración o variables.

## Riesgos y controles

- Revocar lectura anónima directa de `recipes` puede afectar sitemap, búsquedas o páginas auxiliares. T1 enumera consumidores y T4 los migra a la proyección antes de dar el cambio por cerrado.
- La lectura owner-only de perfiles impide joins actuales. La solución devuelve solo alias y nunca relaja la policy del perfil.
- Los duplicados históricos pueden impedir un índice único directo. Se preservan y se serializan nuevas escrituras; no se sanea sin decisión explícita.
- Cambiar la FK de menú afecta borrado, no lectura ni planificación. Se valida con filas sintéticas locales y se conserva cada referencia.
- Storage y Postgres pueden divergir en fallos parciales. La metadata, el orden seguro y respuestas tipadas evitan borrar el objeto equivocado o mentir sobre el estado.
- Hacer pública la lectura del bucket no autoriza escrituras. Se validan por separado acceso HTTP de lectura y matriz INSERT/UPDATE/DELETE por receta.
- El POST actual puede enviar SMTP. Los tests inyectan un no-op y la demostración desactiva el aviso; no se usan destinatarios ni credenciales reales.
- Otros consumidores autenticados consultan recetas/rating/categorías directamente. Solo se adaptan los afectados por grants/RLS, preservando sus contratos y evitando una refactorización general.
- La presencia de una migración no acredita aplicación local o remota. Los resultados locales se registran por separado y el usuario gestiona manualmente el remoto.

## Impactos declarados

- **Supabase / base de datos:** sí; nueva migración, RLS, grants, funciones/proyección, FK, metadata y constraints.
- **Autenticación / autorización:** sí; sesión SSR, propietario/admin y todos los roles autenticados en creación.
- **Storage:** sí; bucket `recipe-images`, lectura pública y escrituras owner/admin con ciclo seguro.
- **APIs y UI:** sí; lectura pública, CRUD, categorías, ratings e imágenes.
- **Variables de entorno:** no se añaden ni cambian.
- **SMTP:** no se cambia configuración ni se envían correos durante pruebas; se preserva el efecto existente solo bajo su opción actual.
- **OpenAI, Vercel y cron:** sin impacto; no se ejecutan ni modifican.
