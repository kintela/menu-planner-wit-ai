# Tareas — Alertas del congelador

> **Gate previo:** spec y plan aprobados el 2026-11-15. **Tareas aprobadas por
> el usuario el 2026-11-15**, que autorizó además iniciar T1. Las tareas son secuenciales; cada una escribe primero sus tests
> y cierra con gate `node --test`, y las que tocan aplicación añaden
> `npm run lint`.

> **Gates permanentes de esta spec:** ninguna ejecución de
> `/api/cron/freezer-alerts` contra producción, ni manual ni programada.
> Ningún envío de correo real: todo contra el buzón local del stack aislado
> `menu-planner-wit-ai`. La migración se aplica y valida **solo en local**; su
> aplicación en remoto es un paso manual posterior del usuario. El proyecto
> está vinculado al remoto `PlanificadorMenus`: usar siempre `--local` y la
> CLI 2.120.0 de Homebrew. No se inventa ningún valor de secreto.

1. **T1 — Auditoría local previa. — HECHA (2026-11-17).** RF-3, RF-5, RF-7. Inspeccionar en solo
   lectura el esquema local de `elementos_cajon`, `cajones_congelador` y
   `congeladores`, los grants y políticas vigentes tras `20261025100000`, y
   todos los consumidores actuales de la ruta de alertas. Confirmar stack local
   aislado y ausencia de destino remoto.
   **Hecho cuando:** queda registrado el estado real de tablas, grants y
   consumidores, sin ejecutar SQL de cambio, sin tocar remoto y sin modificar
   ningún archivo.

   **Evidencia T1 (2026-11-17).** Trabajo exclusivamente local sobre el stack
   aislado `menu-planner-wit-ai` (PostgreSQL 17.11, base `postgres`, 3 usuarios
   locales). No se ejecutó SQL de cambio, no se tocó el remoto y no se modificó
   ningún archivo de aplicación.

   **Esquema real de `elementos_cajon`:** clave primaria `id` de tipo `uuid`;
   `cajon_id uuid NOT NULL`; `nombre text NOT NULL`; `cantidad numeric`;
   `unidad text`; `estado text NOT NULL`; `categoria text`; `fecha_compra`,
   `fecha_congelacion` y `fecha_caducidad` de tipo `date`; `notas`,
   `imagen_url`, `creado_en`, `actualizado_en` y `reservado`. La tabla de
   avisos de T2 debe referenciar `elementos_cajon(id)` con tipo `uuid`. **No
   existe hoy ninguna tabla de avisos o alertas** en `public`.

   **Grants vigentes tras `20261025100000`:** `congeladores`,
   `cajones_congelador` y `elementos_cajon` conceden `SELECT, INSERT, UPDATE,
   DELETE` a `authenticated` y el conjunto completo a `service_role`;
   `congeladores_usuarios` solo concede a `service_role`. Ni `anon` ni `PUBLIC`
   tienen privilegios sobre ninguna de las cuatro. La tabla de avisos seguirá
   este criterio y no concederá nada a `anon` ni a `authenticated`.

   **RLS:** activo (`relrowsecurity = true`) en las tres tablas, con cuatro
   políticas por tabla (SELECT, INSERT, UPDATE, DELETE) apoyadas en las
   funciones del esquema `private`. El proceso de alertas accede con
   service-role, que no pasa por RLS, por lo que la autorización efectiva
   la impone el código: de ahí la importancia de RF-1 y RF-2.

   **Consumidores reales de la ruta — hallazgo que corrige el plan:**
   además de la invocación programada declarada en `vercel.json`,
   `app/admin/page.tsx` la invoca por POST en dos acciones: `handleSendTest`
   con `{ testEmail: true }` y `handleSendAlert` con
   `{ dryRun: false, testEmail: false }`, que **envía la alerta real**. Esa
   página consume los campos `ok`, `sent`, `message`, `error`, `eligibleItems`,
   `thresholdDate` e `items`, y está protegida comprobando `profile.role ===
   "admin"` en cliente. **El contrato de respuesta debe preservarse** en T6.
   Esto explica además por qué el fallo pasó inadvertido: por la vía de
   administrador autenticado la ruta sí funciona; solo falla la programada.

   **Cobertura de tests:** ninguna. No existe hoy ningún test que cubra la
   funcionalidad de alertas.

   **Variables que lee la ruta:** `FREEZER_ALERT_MONTHS`,
   `FREEZER_ALERT_RECIPIENTS`, `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y las cinco `SMTP_*`.
   De ellas, **`NEXT_PUBLIC_APP_URL` no está configurada en Vercel**, por lo que
   la URL base del correo se deriva del host de la petición.

   **Incidencia de entorno resuelta durante la tarea:** al reiniciar el stack
   local, la CLI intentaba arrancar PostgreSQL 15.8 sobre un volumen de datos
   inicializado con PostgreSQL 17, y el contenedor quedaba en bucle de
   reinicio. La causa era `supabase/.temp/postgres-version` (fichero de caché
   de la CLI, ignorado por git) fijado en `15.8.1.102`. Se corrigió a
   `17.11.0.006` y se añadió `major_version = 17` a `[db]` en
   `supabase/config.toml` para que la versión quede declarada en el proyecto.
   **Son los dos únicos archivos modificados en T1**; no se perdió ningún dato
   local.

2. **T2 — Migración del registro de avisos, con test primero. — HECHA (2026-11-17).** RF-7, RF-9,
   RF-10. Escribir primero un test `node:test` que exija la tabla de avisos con
   su clave foránea al elemento en cascada, unicidad por elemento y ausencia de
   grants a `anon` y `authenticated`; después crear la migración versionada
   posterior a `20261025100000`, con nombre y columnas en castellano.
   **Hecho cuando:** el test falla antes y pasa después; la migración no altera
   la baseline ni migraciones existentes. **Afecta a Supabase y base de datos.**

   **Evidencia T2 (2026-11-17).** Orden respetado: primero el test, luego el SQL.
   `tests/migrations/freezer-alerts-notice-registry.test.js` se escribió antes
   que la migración y falló con «falta la migración» en sus 6 casos; tras crear
   `supabase/migrations/20261117000000_crear_avisos_elementos_cajon.sql`, los 6
   pasan. Gate completo `node --test`: **388 tests, 388 pasados, 0 fallidos**
   (382 previos más los 6 nuevos).

   **Diseño adoptado.** Tabla `public.avisos_elementos_cajon` con
   `elemento_id uuid` como **clave primaria** y clave foránea a
   `public.elementos_cajon (id)` con `ON DELETE CASCADE`: la primaria da la
   unicidad por elemento que exige el recordatorio individual (RF-9) y la
   cascada cumple RF-10 sin proceso de limpieza. `avisado_en timestamptz NOT
   NULL DEFAULT now()` guarda el momento del último aviso, del que se deriva el
   vencimiento de los 30 días; `creado_en` conserva el primer aviso. Índice
   sobre `avisado_en`, que es por donde consulta el proceso. Nombres de tabla y
   columnas en castellano, coherentes con el dominio.

   **Autorización de la tabla.** RLS habilitado y **ninguna política**: ningún
   rol sujeto a RLS obtiene filas. `REVOKE ALL` para `PUBLIC`, `anon` y
   `authenticated`, y `GRANT SELECT, INSERT, UPDATE, DELETE` únicamente a
   `service_role`, que no está sujeto a RLS y es el que usa el proceso. Es más
   restrictivo que las tablas de inventario auditadas en T1, que sí conceden a
   `authenticated`, porque este registro no se expone a la aplicación.

   **Corrección de un test propio, no de la implementación.** El caso de grants
   falló inicialmente por un falso positivo: la expresión buscaba el rol
   `PUBLIC` en la sentencia completa y casaba con el esquema `public` del
   identificador de la tabla. Se corrigió el test para examinar solo los roles
   destinatarios situados tras el `TO`. No se relajó ninguna exigencia: la
   migración no se modificó para que el test pasara.

   **Alcance.** La migración solo crea objetos nuevos; no altera la baseline,
   ninguna migración existente ni las tablas y políticas del singleton, y el
   test lo verifica. **No se ha aplicado a ninguna base**: comprobado que
   `public.avisos_elementos_cajon` sigue ausente en local, porque aplicarla y
   validarla corresponde a T3. Ninguna operación remota.

3. **T3 — Aplicar y validar la migración solo en local. — HECHA (2026-11-17).** RF-7, RF-9, RF-10.
   Confirmar stack aislado y ausencia de destino remoto; hacer dry-run local,
   aplicar con `--local` y verificar el resultado en el catálogo local,
   incluida la cascada al eliminar un elemento sintético.
   **Hecho cuando:** la migración queda aplicada y verificada en local, las
   filas sintéticas eliminadas, y se deja constancia de que el remoto no se
   tocó y queda como paso manual del usuario.

   **Evidencia T3 (2026-11-17).** Gate de destino confirmado antes de aplicar:
   base `postgres` del contenedor local `menu-planner-wit-ai`, PostgreSQL
   17.11. El dry-run con `--local` anunció **una sola** migración pendiente,
   `20261117000000_crear_avisos_elementos_cajon.sql`, y `db push --local` la
   aplicó. `migration list --local` la refleja como aplicada. **Ninguna
   operación remota.**

   **Catálogo real tras aplicar.** Columnas `elemento_id uuid NOT NULL`,
   `avisado_en timestamptz NOT NULL` y `creado_en timestamptz NOT NULL`;
   `PRIMARY KEY (elemento_id)` y `FOREIGN KEY (elemento_id) REFERENCES
   elementos_cajon(id) ON DELETE CASCADE`; `relrowsecurity = true` con **0
   políticas**; índices `avisos_elementos_cajon_pkey` y
   `avisos_elementos_cajon_avisado_en_idx`.

   **Autorización comprobada con `has_table_privilege`**, no solo por
   inspección del SQL: `anon` SELECT = false; `authenticated` SELECT = false e
   INSERT = false; `service_role` SELECT = true. Los únicos receptores de
   grants son `postgres` y `service_role`. Se deja constancia de que
   `service_role` aparece además con `REFERENCES`, `TRIGGER` y `TRUNCATE`,
   procedentes de los privilegios por defecto del proyecto y no de esta
   migración.

   **RF-10 verificado en ejecución, no por inspección.** En una transacción con
   `ROLLBACK` se crearon un congelador, un cajón y un elemento sintéticos más su
   aviso: el estado intermedio fue `elementos=1  avisos=1`; tras `DELETE` del
   elemento quedó `elementos=0  avisos=0`, confirmando que la cascada retira el
   aviso sin intervención. El `ROLLBACK` dejó la base como estaba y la
   comprobación posterior arroja `congeladores=0 elementos=0 avisos=0`: **no
   quedan filas sintéticas**.

   **Aplicación en remoto (2026-11-17, por el usuario).** El usuario aplicó y
   registró manualmente la migración en remoto y aportó la salida de
   `supabase migration list --linked`: las 14 migraciones, de `20261024000000` a
   `20261117000000`, figuran con Local y Remote coincidentes. Operación del
   usuario; el agente no ejecutó ningún comando remoto y no hubo validación
   remota independiente. **Pendiente solo `CRON_SECRET`**, que debe existir en
   Vercel antes de desplegar el código de esta spec (T9).

4. **T4 — Dominio puro de elegibilidad, recordatorio y destinatarios. — HECHA (2026-11-17).** RF-3,
   RF-4, RF-6, RF-8, RF-9, RF-9 bis, RF-11, RF-13, RF-19. Escribir primero los
   tests con `hoy` inyectado; después implementar en `lib/freezer/` las
   funciones puras de fecha umbral con validación del valor configurado,
   selección de elegibles, decisión de a quién avisar entre nuevos y
   recordatorios vencidos, normalización y deduplicación de destinatarios, y
   cálculo del tiempo congelado.
   **Hecho cuando:** los tests cubren umbral inválido, negativo y cero;
   elementos sin fecha y con fecha futura; primer aviso; silencio sin
   novedades; recordatorio justo antes y justo después de los 30 días; lista de
   destinatarios con duplicados, vacíos y espacios. Sin red ni dependencias de
   Next o Supabase.

   **Evidencia T4 (2026-11-17).** Test primero: `tests/unit/lib/freezer-alerts-domain.test.js`
   falló con «Cannot find module» antes de existir el módulo; tras crear
   `lib/freezer/freezer-alerts-domain.js` y su `.d.ts`, pasan sus **25 tests**.
   Gate completo `node --test`: **413 tests, 413 pasados, 0 fallidos** (388
   previos más 25). `npm run lint` exit 0, `git diff --check` limpio y
   `npx tsc --noEmit` sin errores atribuibles a los ficheros nuevos.

   **API (nombres en castellano, como el resto de `lib/freezer/`):**
   `parseMesesUmbral`, `parseDiasRecordatorio`, `calcularFechaUmbral`,
   `seleccionarElegibles`, `decidirAvisos`, `avisosObsoletos`,
   `normalizarDestinatarios` y `calcularTiempoCongelado`, más las constantes de
   2 meses y 30 días. Sin red, sin Next, sin Supabase y **sin reloj global**: el
   instante `hoy` se inyecta siempre, y un test comprueba que otro `hoy` da otro
   resultado. Las fechas de calendario se tratan en UTC para no depender de la
   zona horaria del servidor.

   **Cobertura de los casos límite de la tarea:** umbral ausente, no numérico,
   negativo, cero, fraccionario, `NaN` e infinito (todos caen a 2); resta de
   meses con ajuste al fin de mes, incluido bisiesto; elementos sin fecha, con
   fecha futura, ilegible o imposible (`2026-02-31`), ninguno elegible;
   primer aviso; silencio sin novedades; recordatorio a 29, 30 y 31 días;
   destinatarios con duplicados, vacíos, espacios, mayúsculas, entradas que no
   parecen direcciones y lista ausente.

   **Decisiones de diseño que conviene conocer:**
   - **El recordatorio se mide en días naturales, no en horas.** El aviso se
     registra a las 08:00:05 y la ejecución siguiente llega a las 08:00:02: por
     horas serían 29 d 23 h 59 min 57 s y el recordatorio se retrasaría un día
     cada ciclo. Hay un test específico para este caso.
   - **Un umbral fraccionario (`1.5`) se trata como inválido** y cae a 2, en lugar
     de truncarse en silencio.
   - **Un aviso con fecha ilegible no bloquea el aviso:** se trata como ausente,
     en coherencia con preferir repetir un aviso a perderlo.
   - **Las entradas de destinatarios inválidas se cuentan, pero nunca se
     devuelven**, para que T6 pueda advertir de la configuración sin escribir
     direcciones en los registros. No existe lista por defecto (RF-12), y un test
     verifica que el módulo no contiene ninguna dirección de correo.

   **Corrección de un test propio antes de implementar.** El caso de RF-19
     usaba una fecha que ya era elegible con el umbral de 2 meses, por lo que no
     probaba lo que afirmaba. Se corrigió el test (fecha `2026-10-10`, elegible
     solo con 1 mes) antes de escribir el módulo; no se relajó ninguna aserción.

   **Alcance.** Ningún archivo existente modificado; la ruta de alertas sigue
   intacta y se adapta en T5–T7. Sin operaciones remotas, sin correo y sin
   ejecutar la ruta.

5. **T5 — Autorización fiable del proceso. — HECHA (2026-11-17).** RF-1, RF-2. Escribir primero los
   tests de la decisión de autorización; después sustituir la comprobación por
   acreditación mediante el secreto compartido que el programador envía en la
   cabecera `Authorization`, comparado en tiempo constante, conservando la vía
   de administrador autenticado y corrigiendo la llamada a `isAdmin` para que
   reciba el cookie store que exige su firma.
   **Hecho cuando:** los tests acreditan que sin secreto válido y sin sesión
   admin la respuesta es «no autorizado»; que esa respuesta es uniforme y no
   revela existencia de congelador ni número de elementos; y que el secreto no
   aparece en logs ni en la respuesta. **Requiere la variable de servidor
   `CRON_SECRET`, que el usuario debe crear en Vercel; no se inventa su valor.**

   **Evidencia T5 (2026-11-17).** Test primero: `tests/unit/lib/freezer-alerts-authorization.test.js`
   falló con «Cannot find module»; tras crear `lib/freezer/freezer-alerts-authorization.js`
   (+ `.d.ts`) y editar la ruta, pasan sus **19 tests**. Gate completo `node --test`:
   **432 tests, 432 pasados, 0 fallidos** (413 previos más 19). `npm run lint`
   exit 0. `npx tsc --noEmit` ya no emite el `TS2554` de `isAdmin` en esta ruta;
   queda solo el `TS7016` preexistente de `nodemailer`.

   **Diseño.** `decidirAutorizacion` acredita al programador con
   `Authorization: Bearer <CRON_SECRET>` (lo que Vercel envía cuando la variable
   existe), comparado en tiempo constante con `timingSafeEqual` sobre resúmenes
   SHA-256, de modo que ni siquiera la longitud del secreto se filtra. La vía de
   administrador se conserva y solo se consulta si la credencial del programador
   no basta; si esa consulta falla, se deniega en lugar de propagar el error.
   **Sin secreto configurado, la vía del programador queda cerrada**, y hay un test
   para el caso peligroso: secreto vacío frente a token vacío no deben coincidir.
   Todo rechazo usa un único objeto congelado (`403`, `{ error: "No autorizado" }`),
   el mismo contrato que ya consumía la página de administración.

   **Cambios en la ruta (localizados; el resto de su lógica es de T6/T7):** se
   eliminan `isTruthyHeader` e `isCronRequest`, y con ellos toda dependencia de
   `x-vercel-cron` y del user-agent; la autorización pasa por el módulo; y
   `isAdmin` recibe ahora el cookie store (`await cookies()`) que exige su firma.
   **`lib/auth.ts` no se tocó.**

   **Verificación en ejecución** (no solo estática), con `next dev` contra el
   Supabase local, `?dryRun=1` (no envía nada), SMTP en blanco, un destinatario
   ficticio `@example.test` y un `CRON_SECRET` aleatorio inyectado solo en el
   entorno del proceso, sin tocar `.env.local` ni persistirlo: sin cabeceras,
   `403`; **con las cabeceras que Vercel envía hoy** (`x-vercel-cron: 1` y
   user-agent `vercel-cron/1.0`) **y con el user-agent `vercel cron` que buscaba el
   código antiguo, `403`**; `Bearer` incorrecto, `Bearer` vacío y `Basic` con el
   secreto correcto, `403`; `Bearer <secreto>`, `200` con `dryRun: true` y
   `sent: false`. Los tres rechazos probados devuelven el mismo cuerpo, con hash
   idéntico. Servidor parado, puerto liberado y secreto temporal borrado.

   **Límites declarados.** (1) **La vía de administrador no se ha probado en
   ejecución**: requiere una sesión admin real y se demuestra en T8 desde
   `/admin`; hasta entonces solo está cubierta por el test del módulo y por la
   comprobación estática de que `isAdmin` recibe el cookie store. (2) Las
   comprobaciones de la ruta en los tests son estáticas. (3) **Consecuencia
   operativa:** hasta que `CRON_SECRET` exista en Vercel, la ejecución
   programada seguirá recibiendo `403`, exactamente como hoy; no empeora, pero
   tampoco se arregla. De ahí que T9 exija crear el secreto **antes** del
   despliegue. Ningún correo enviado, ninguna operación remota y la ruta no se
   ejecutó contra producción.

   **Variable nueva:** `CRON_SECRET` (solo servidor, sin prefijo `NEXT_PUBLIC_`).
   No se ha creado en ningún sitio ni se ha inventado un valor real.

6. **T6 — Presentación del aviso y ruta como adaptador fino. — HECHA (2026-11-17).** RF-6, RF-11,
   RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18. Escribir primero los tests
   de presentación y de los tres resultados posibles; después trasladar asunto
   y cuerpo a un módulo puro en castellano con lista única y escape del
   contenido variable, dejar la ruta como adaptador, proteger el envío para que
   un fallo no registre avisos ni exponga credenciales, eliminar
   `DEFAULT_RECIPIENTS` y toda dirección del código, y conservar el modo de
   comprobación sin envío ni registro.
   **Hecho cuando:** los tests distinguen «sin novedades», «aviso enviado» y
   «fallo»; una búsqueda en el repositorio no encuentra direcciones de correo;
   sin destinatarios configurados no se envía; y la configuración SMTP
   incompleta se señala sin revelar valores.

   **Evidencia T6 (2026-11-17).** Test primero en los tres módulos nuevos y en la
   ruta; cada uno falló antes de implementar. Tests nuevos: presentación 13,
   operaciones de servidor 29 y ruta 7 (estáticos). Gate completo `node --test`:
   **481 tests, 481 pasados, 0 fallidos** (432 previos más 49). `npm run lint`
   exit 0; `npm run build` compila (`✓ Compiled successfully`); `npx tsc
   --noEmit` solo conserva el `TS7016` preexistente de `nodemailer`.

   **Estructura resultante.** `lib/freezer/freezer-alerts-presentation.js`
   (correo en castellano, escape de HTML, enlace solo para orígenes `http(s)`),
   `lib/freezer/freezer-alerts-server-operations.js` (configuración y
   orquestación con todas sus dependencias inyectadas: base de datos y correo) y
   `app/api/cron/freezer-alerts/route.ts`, que pasa de **413 a 128 líneas** y
   queda como adaptador: acredita, lee entorno, conecta Supabase y SMTP y
   delega. Con esto la ruta deja de ser una excepción al principio 3 de
   `docs/constitution.md`.

   **Los tres resultados (RF-14, requisito de la tarea).** El cuerpo añade
   `resultado`: `sin_novedades`, `aviso_enviado` o `fallo`, más `comprobacion` y
   `prueba_enviada` para los modos manuales. Cubierto por tests: sin elementos,
   todo ya avisado, primer aviso, recordatorio vencido, fallo de envío, fallo
   al leer, correo sin configurar y comprobación.

   **Verificado por tests:** un único correo agrupa todos los elementos (RF-6);
   el aviso se registra solo tras un envío correcto y con el reloj inyectado
   (RF-7); si el envío falla **no se registra ni se descarta nada**, se deja
   constancia por `registrarError` y el cuerpo no contiene la contraseña, el
   host ni el usuario SMTP (RF-14); tras un fallo, la ejecución siguiente vuelve
   a intentarlo; si el correo sale pero falla el registro se informa
   `avisosRegistrados: false` sin dar el envío por fallido; los avisos de
   elementos que dejan de ser elegibles se descartan tras el envío o cuando no
   hay nada que avisar, y **nunca** en una comprobación ni en un fallo (RF-10);
   la comprobación no envía, no registra ni descarta, y no exige correo
   configurado (RF-16); sin destinatarios no se consulta ni se envía y se
   nombra `FREEZER_ALERT_RECIPIENTS` (RF-11); con correo incompleto se listan
   **solo los nombres** de las variables que faltan, nunca valores (RF-15).
   RF-12: ni la ruta ni los módulos contienen direcciones de correo, y
   `DEFAULT_RECIPIENTS` desaparece (comprobado por test).

   **Contrato de `/admin` preservado.** Se conservan `ok`, `sent`, `message`,
   `error`, `eligibleItems`, `thresholdDate`, `items`, además de `checkedAt`,
   `alertMonths`, `dryRun` y `recipients`. **Cambios deliberados:** (1) los
   elementos ya no incluyen `usuario_id`, dato que la página no usa y que
   exponía el identificador del propietario; la consulta tampoco lo trae;
   (2) `items` lista los elementos que se **avisarían en esa ejecución**
   (nuevos y recordatorios vencidos), mientras `eligibleItems` cuenta todos los
   que superan el umbral; (3) los textos pasan a castellano con tildes y
   concordancia. No se modificó `app/admin/page.tsx`.

   **Verificación en ejecución** con `next dev` contra el Supabase local,
   `dryRun`, SMTP en blanco y un secreto aleatorio solo en el entorno del
   proceso: sin credenciales `403`; con `Bearer` correcto y `?dryRun=1`, `200`,
   `resultado: sin_novedades`, lo que confirma que PostgREST acepta la consulta
   de elementos y la lectura de `avisos_elementos_cajon` con la clave de
   servicio; `testEmail` + `dryRun`, `comprobacion` sin envío; `POST
   {testEmail:true}` sin correo configurado, `500` listando
   `SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL`. Los registros del
   servidor no contienen secretos. Servidor parado y secreto borrado. Ningún
   correo enviado, ninguna operación remota.

   **Límites declarados.** (1) El envío real por SMTP (nodemailer) solo se ha
   probado con dependencias simuladas; la demostración contra un receptor local
   es de T8. (2) La consulta **todavía no se limita al congelador único**: es
   el alcance de T7. (3) El envío con datos reales (fecha de congelación
   anterior al umbral) no se ha ejercitado en ejecución porque la base local no
   tiene inventario; T8 lo hará con datos sintéticos. (4) La vía de
   administrador sigue pendiente de demostración (T8).

   **Consecuencia operativa que conviene conocer.** El botón de alerta de
   `/admin` ejecuta la misma lógica que el cron, así que respeta el registro de
   avisos: tras un aviso, volver a pulsarlo dará «sin novedades» en lugar de
   reenviar todo. Y la **primera** ejecución correcta, sea programada o manual,
   avisará de los once elementos acumulados y los registrará, de modo que no
   volverán a avisarse hasta pasados 30 días.

   **Variable nueva, opcional:** `FREEZER_ALERT_REMINDER_DAYS` (solo servidor,
   periodo de recordatorio; 30 si falta o no es válida). No es necesario crearla.
   Se sigue sin usar `SMTP_SECURE` (comportamiento preexistente: seguro solo en
   el puerto 465).

7. **T7 — Alcance singleton y concurrencia. — HECHA (2026-11-17).** RF-5. Resolver primero el
   congelador único y limitar los elementos a sus cajones; terminar sin avisar
   y sin error cuando no existe congelador; escribir el registro de avisos de
   forma condicional para que dos ejecuciones solapadas no produzcan dos
   correos con los mismos elementos.
   **Hecho cuando:** los tests cubren ausencia de congelador, congelador sin
   cajones y cajones sin elementos, y una ejecución solapada simulada no
   duplica el aviso. El fallback de propietario histórico y los nombres en
   castellano se preservan.

   **Evidencia T7 (2026-11-17).** Test primero: se reescribieron los dobles del
   orquestador y se añadieron 12 tests; 14 fallaron antes de implementar. Gate
   completo `node --test`: **499 tests, 499 pasados, 0 fallidos** (481 previos
   más 18 netos). `npm run lint` exit 0; `npm run build` compila; `npx tsc
   --noEmit` sin errores nuevos (quedan el `TS7016` de `nodemailer` en esta ruta
   y dos errores de `app/admin/users/page.tsx`, ambos preexistentes y en
   ficheros no tocados).

   **Corrección de diseño respecto a T6, que hay que conocer.** T6 enviaba y
   *después* registraba el aviso. Eso no puede evitar duplicados: dos
   ejecuciones solapadas leen el mismo estado y las dos envían (Vercel documenta
   que puede entregar un evento de cron más de una vez, y además existe el botón
   de `/admin`). T7 lo sustituye por **reclamar antes de enviar y liberar si el
   envío falla**: un elemento nuevo se reclama insertándolo solo si no existe
   (`upsert` con `ignoreDuplicates`, que devuelve únicamente lo ganado); un
   recordatorio, actualizándolo solo si su fecha sigue siendo la leída
   (comparación exacta); se envía **solo lo ganado**; y si el envío falla se
   liberan **únicamente los reclamos propios** y solo mientras sigan marcados con
   el instante de esta ejecución. Desaparece `registrarAvisos`. Dos consecuencias
   que el spec no contemplaba y que se asumen: (1) el caso «el correo sale pero
   falla el registro» ya no puede ocurrir —sin reclamo no se envía y se responde
   `fallo`—; (2) aparece el caso inverso, **reclamo hecho + envío fallido +
   liberación fallida**, que dejaría el elemento dado por avisado sin haberlo
   sido hasta su recordatorio (30 días). Es una doble avería, queda registrada
   por `registrarError("registro")` y se acepta como mejor que duplicar; no hay
   reintento de la liberación.

   **Congelador único (RF-5).** `resolverCongelador` lee `congeladores` con
   `limit(2)`: sin filas devuelve «No existe ningún congelador» (`200`,
   `sin_novedades`, sin error y sin consultar el inventario); con una, limita la
   consulta de elementos a sus cajones mediante `cajones_congelador!inner` y
   `eq(congelador_id)`; con más de una **falla con código `CONGELADOR_AMBIGUO` en
   lugar de elegir una**. El correo de prueba no consulta el congelador. Un
   congelador sin cajones o con cajones vacíos devuelve cero filas y no avisa.
   La consulta ya no trae el propietario.

   **Verificación en ejecución** (`next dev` contra el Supabase local, SMTP real
   hacia un receptor local en `127.0.0.1:2525` fuera del repositorio, datos
   sintéticos y un secreto aleatorio solo en el entorno del proceso):
   - **Singleton en la base:** un segundo congelador es rechazado por
     `congeladores_singleton_global_idx` (con el mismo usuario saltó antes la
     restricción por `usuario_id`).
   - **Comprobación:** `dryRun` listó los 3 elegibles y dejó `0` correos y `0`
     avisos.
   - **Carrera real:** 25 peticiones simultáneas → **1 `aviso_enviado` y 24
     `sin_novedades`**; de ellas **4 perdieron el reclamo** («otra ejecución ya
     avisó») y 20 llegaron cuando ya constaba. **1 correo** con los 3 elementos,
     asunto `[Congelador] 3 elementos con 2+ meses`, destinatarios correctos y
     3 filas en el registro. Una primera ráfaga de 5 también dio 1 correo, pero
     las 4 restantes leyeron después de registrar y no pisaron la ventana crítica;
     por eso se repitió con 25 para alcanzarla de verdad.
   - **Recordatorio:** con `T7 Pan` avisado hace 40 días (marca con
     microsegundos), 6 peticiones simultáneas → 1 correo con **solo Pan**, y su
     fecha pasó a la actual.
   - **Fallo de envío (el receptor rechaza):** `500`, `resultado: fallo`, error
     genérico, **0 correos**, y el registro quedó **idéntico al de antes, byte a
     byte**, incluida la fecha de Perejil con microsegundos; el elemento nuevo
     siguió sin constar. Sin rastro de credenciales ni del host SMTP en el cuerpo
     ni en el log del servidor. Retirado el fallo, la ejecución siguiente avisó de
     ambos (1 nuevo + 1 recordatorio).
   - **RF-10:** al dejar de ser elegible `T7 Arroz`, su aviso se descartó (de 4
     filas a 3) sin enviar nada.
   - **RF-5:** tras eliminar el congelador sintético, `200` con «No existe ningún
     congelador», `ok: true`, `sent: false` y 0 correos.
   - **Limpieza:** congeladores, cajones, elementos y avisos de la base local a
     `0/0/0/0`; servidor y receptor parados, puertos 3000 y 2525 libres, y
     secreto, correos capturados y script del receptor borrados.
   Una comprobación intermedia («conservan su fecha anterior») estaba mal
   planteada —medía «hace más de 1 minuto» sobre avisos más recientes— y **no se
   toma como evidencia**; lo que prueba que no se reenviaron es el contenido del
   correo, con solo Pan.

   **Límites declarados.** (1) La contienda se ejercitó contra un único proceso
   de Next; varias instancias en Vercel dependen igualmente de la atomicidad de la
   base, que es la que da la garantía, pero no se ha probado con instancias
   separadas. (2) El fallback de propietario histórico pertenece al acceso por
   usuario de `lib/freezer-access.ts`, que esta ruta no usa (accede con
   service-role al congelador único); no se tocó y los nombres en castellano se
   conservan. (3) La vía de administrador sigue pendiente de demostrar desde
   `/admin` (T8). (4) Se relajó un test propio: el tope de tamaño de la ruta
   pasó de 160 a 200 líneas porque el pegamento de Supabase del reclamo atómico
   la llevó a 193; se mantiene intacta la comprobación de que no hay lógica de
   negocio ni de presentación en ella, y se dejó escrito el porqué en el test.
   Ningún correo real, ninguna operación remota, la ruta no se ejecutó contra
   producción.

8. **T8 — Verificación integral local y demostración. — HECHA (2026-11-17).** RF-1–RF-19. Ejecutar
   tests focales y `node --test`, `npx tsc --noEmit`, `npm run lint`,
   `npm run build` y `git diff --check`, separando la deuda preexistente.
   Demostrar contra el stack local: primera ejecución que avisa, segunda que
   calla, recordatorio con reloj inyectado, invocación no autorizada, fallo de
   envío y ausencia de destinatarios, con el correo comprobado en el buzón
   local. Revisar secretos, alcance y trazabilidad completa.
   **Hecho cuando:** toda la evidencia está registrada, no hubo operaciones
   remotas ni correos reales, los datos sintéticos quedan eliminados y las
   limitaciones no se presentan como validaciones exitosas.

   **Evidencia T8 (2026-11-17).**

   **Gates.** Tests focales de la spec: migración 6, dominio 25, autorización 19,
   presentación 13, operaciones 41 y ruta 13 (**117**, todos en verde). `node
   --test` completo: **499 tests, 499 pasados, 0 fallidos**. `npm run lint` exit 0.
   `npm run build` compila y lista `ƒ /api/cron/freezer-alerts`. `git diff
   --check` limpio.

   **`tsc`: deuda separada de lo nuevo.** Se compiló `HEAD` en un worktree
   temporal (ya eliminado) y se compararon los conjuntos de errores únicos tras
   normalizar las rutas absolutas: **284 en `HEAD`, 283 ahora; 0 nuevos y 1
   resuelto** (el `TS2554` de `isAdmin` en esta ruta). Quedan 283 de deuda
   preexistente ajena a la spec (entre ellos `nodemailer` sin tipos y
   `app/admin/users/page.tsx`). Un primer cotejo daba 2 «nuevos» que eran la misma
   incidencia con otro prefijo de ruta en el mensaje; se descartaron al normalizar.

   **Alcance.** Ficheros tocados: los 8 módulos de `lib/freezer/`, la ruta,
   la migración, 6 ficheros de test, `specs/007-*`, `docs/constitution.md`,
   `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, dos skills, `MEMORY.md` y
   `supabase/config.toml` (`major_version = 17`, de T1). **Sin cambios:**
   `vercel.json`, `lib/auth.ts`, `app/admin/page.tsx`, `.env.local`,
   `package.json`, `package-lock.json` y todas las migraciones anteriores.

   **Secretos y direcciones.** Escaneados los 19 ficheros de la spec: **0**
   direcciones de correo en código de producción, **0** patrones de claves reales,
   y las únicas direcciones en tests y specs son de ejemplo (`@example.test`;
   `Ana@Example.test` es una variante en mayúsculas intencionada de un test).
   `CRON_SECRET` aparece solo como nombre de variable, sin valor. Las dos
   direcciones personales que estaban fijas en la ruta antigua **ya no existen**
   en ella. Un primer escaneo dio «0» sin haber leído ningún fichero (zsh no
   expande globs dentro de variables) y se descartó; se repitió con la lista
   real de ficheros.

   **Hallazgo ajeno a la spec, no corregido por estar fuera de alcance.** Una de
   esas direcciones personales figura además en listas de administradores por
   correo en `lib/auth.ts`, `lib/auth-client.ts` y
   `app/api/admin/fix-missing-profiles/route.ts`, y como valor inicial en
   `app/test-email/page.tsx`. Ninguno de esos ficheros se modificó. Registrado en
   `MEMORY.md`.

   **Trazabilidad calculada** a partir de los títulos de los tests (no a mano):
   **los 20 RF** —RF-1 a RF-19 y RF-9 bis— tienen al menos un test que los cita:
   RF-1 (7), RF-2 (9), RF-3 (5), RF-4 (3), RF-5 (6), RF-6 (2), RF-7 (3), RF-8 (3),
   RF-9 (5), RF-9 bis (4), RF-10 (4), RF-11 (5), RF-12 (5), RF-13 (4), RF-14 (2),
   RF-15 (3), RF-16 (2), RF-17 (2), RF-18 (2) y RF-19 (1). Es una cota inferior:
   hay tests que cubren un RF sin citarlo en el título.

   **Demostración en ejecución** (`next dev` contra el Supabase local, SMTP real
   hacia un receptor local fuera del repositorio, inventario y usuarios
   sintéticos, `CRON_SECRET` aleatorio solo en el entorno del proceso):
   - **Vía de administrador, con sesión real desde `/admin`** (la que T5 dejó
     pendiente). Con una cuenta sintética `admin`: «Enviar email de prueba» →
     «Correo de prueba enviado correctamente.»; «Enviar alerta de congelador» →
     «Aviso enviado correctamente. Elementos detectados: 3 (antes de
     2026-09-17)» con la tabla de los 3 elementos y sus seis columnas; segunda
     pulsación → «Sin novedades: los elementos que superan el umbral ya fueron
     avisados.» **El contrato que consume la página se conserva sin tocarla.**
   - **Rechazos con sesión:** sin sesión, `403 {"error":"No autorizado"}`
     (`cookieLocal: false`); con un usuario autenticado de rol `user_restricted`,
     el mismo `403`. Un primer intento «sin sesión» devolvió `200` porque el
     cierre de sesión no se había completado (el botón no existe en `/admin`); se
     detectó, **se descartó como prueba** y se repitió cerrando sesión desde
     `/recipes`.
   - **Receptor local:** exactamente **2 correos**: `[Congelador] Correo de
     prueba` y `[Congelador] 3 elementos con 2+ meses` (Pan, Arroz y Perejil), solo
     a los destinatarios configurados. La segunda alerta no envió nada. Sin
     credenciales SMTP ni secreto en el registro del servidor.
   - **Sin destinatarios (RF-11/RF-12):** con `FREEZER_ALERT_RECIPIENTS` vacía,
     `500 «No hay destinatarios configurados. Define FREEZER_ALERT_RECIPIENTS.»`;
     con solo entradas inválidas, el mismo error más «Se descartaron 2 entradas
     que no parecen direcciones»; en ambos casos, ningún correo y ninguna dirección
     por defecto (todos los correos del receptor fueron a las direcciones de la
     configuración de prueba).
   - **Ya demostrado en T5–T7** (no se repite): primer aviso y silencio posterior,
     25 peticiones simultáneas con 1 solo correo, recordatorio vencido,
     fallo de envío con liberación exacta, descarte de avisos obsoletos, sin
     congelador y rechazos con cabeceras de Vercel, `Bearer` erróneo y secreto
     correcto.

   **Limpieza.** Base local a `congeladores=0 cajones=0 elementos=0 avisos=0` y
   0 usuarios sintéticos; los 3 usuarios locales previos no se tocaron. Pestaña
   del navegador cerrada y sesión sintética cerrada. Servidor y receptor
   parados (puertos 3000 y 2525 libres); secreto, correos capturados, logs y
   script del receptor borrados. Ninguna operación remota ni correo real, y la
   ruta no se ejecutó contra producción.

   **Límites que persisten, sin presentarlos como validados.** (1) El recordatorio
   «con reloj inyectado» se prueba con tests y en ejecución desplazando la fecha
   en la base; no hay una demostración con el reloj del servidor adelantado.
   (2) La contienda se ejercitó con un único proceso de Next; en Vercel puede
   haber instancias separadas y la garantía descansa en la atomicidad de la base,
   no probada así. (3) No se ha probado el envío contra el proveedor SMTP real ni
   con TLS. (4) El comportamiento en producción depende de T9: hasta que exista
   `CRON_SECRET` y se despliegue, el cron sigue recibiendo `403`.

9. **T9 — Entrega y puesta en producción.** RF-1, RF-7. Tarea de coordinación,
   no de código. Indicar al usuario el orden obligatorio: **primero** crear
   `CRON_SECRET` en Vercel y aplicar la migración en remoto, **después**
   desplegar. Tras el despliegue, comprobar en los registros de la tarea
   programada que deja de responder 403 y que el resultado es interpretable.
   **Hecho cuando:** el usuario confirma secreto y migración en remoto, y queda
   registrada la primera ejecución programada con su resultado. Advertir de que
   ese primer aviso incluirá los once elementos acumulados.
