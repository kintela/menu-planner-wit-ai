# Plan — Alertas del congelador

## Estado y gate de aprobación

Spec 007 aprobada por el usuario el 2026-11-15, sin dudas abiertas. Este plan deriva de ella y no amplía su alcance. **Plan aprobado por el usuario el 2026-11-15.** Queda habilitada la redacción de tareas; la implementación requiere además la aprobación de `tasks.md`.

Gates que deben cumplirse durante la implementación:

- Ninguna ejecución de `/api/cron/freezer-alerts` contra producción, ni manual ni programada, durante el desarrollo.
- Ningún envío de correo real: las pruebas usan el buzón local del stack de desarrollo aislado `menu-planner-wit-ai`.
- La migración se aplica y se valida **solo en local**. Su aplicación en remoto es un paso manual posterior del usuario.
- Antes de usar la CLI de Supabase, confirmar `--local`: el proyecto está vinculado al remoto `PlanificadorMenus`.

## Estado actual inspeccionado

- `app/api/cron/freezer-alerts/route.ts` concentra 413 líneas: autorización, consulta, normalización, construcción del HTML y envío. Contradice el principio 3 de `docs/constitution.md` y está anotada como excepción conocida.
- **Causa del fallo en producción:** la autorización acepta la invocación si la cabecera `x-vercel-cron` es verdadera o si el user-agent contiene `"vercel cron"`. El programador de Vercel envía `vercel-cron/1.0`, con guion, por lo que la comprobación nunca casa; `isAdmin()` devuelve falso al no haber sesión, y la ruta responde 403. Confirmado en los logs: `Nov 15 09:00:26 GET /api/cron/freezer-alerts 403`.
- `isAdmin()` se invoca sin argumentos aunque su firma exige `cookieStore` (`TS2554`). No rompe en ejecución porque `createServerClient` tiene el parámetro opcional, pero es deuda que el build oculta.
- `DEFAULT_RECIPIENTS` contiene dos direcciones personales en el código, en un repositorio público.
- La consulta lee `elementos_cajon` sin filtrar por congelador; calcula el `usuario_id` del propietario y no lo usa. Hoy coincide con el singleton por casualidad, no por diseño.
- `fecha_caducidad` se selecciona y se normaliza, pero no filtra ni se muestra. En producción **ningún elemento tiene ese dato informado**.
- `transporter.sendMail` no está dentro de `try/catch`: un fallo SMTP propaga y devuelve 500.
- No existe ninguna persistencia de avisos: el proceso no puede saber qué ya se notificó.
- Ya existe lógica pura de congelador en `lib/freezer/` (`freezer-domain.js`, `freezer-access-logic.js`, `freezer-presentation.js`) con tests en `tests/unit/lib/`, que es el patrón a seguir.
- Configuración en Vercel ya presente para Production: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_SECURE`, `FREEZER_ALERT_RECIPIENTS`, `FREEZER_ALERT_MONTHS`. **No existe `CRON_SECRET`.**

## Arquitectura mínima propuesta

### 1. Auditoría local previa

Reinspeccionar en solo lectura el esquema local de `elementos_cajon`, `cajones_congelador` y `congeladores`, los grants y políticas vigentes tras `20261025100000`, y los consumidores actuales de la ruta. Confirmar el stack local aislado y la ausencia de destino remoto. Sin cambios.

**Cubre:** preparación de RF-3, RF-5, RF-7.

### 2. Migración del registro de avisos

Nueva migración versionada posterior a `20261025100000`, con nombre y columnas en castellano por coherencia con el dominio (`congeladores`, `cajones_congelador`, `elementos_cajon`). Registra, por elemento avisado, su identificador y la fecha del último aviso, con clave foránea al elemento y borrado en cascada, de modo que un elemento eliminado descarte su registro sin trabajo adicional.

Acceso restringido: la tabla la escribe el proceso desde servidor con service-role; no se concede acceso a `anon` ni a `authenticated`, siguiendo el criterio de la migración del singleton.

Se escribe primero un test `node:test` que exija la existencia de la tabla, su clave foránea en cascada y la ausencia de grants a roles públicos.

**Cubre:** RF-7, RF-9, RF-10. **Afecta a Supabase y base de datos.**

### 3. Dominio puro de elegibilidad y recordatorio

Módulo nuevo en `lib/freezer/` con funciones puras, sin red ni dependencias de Next o Supabase, con `hoy` inyectado para poder fijar el tiempo en los tests:

- cálculo de la fecha umbral a partir de los meses configurados, con validación del valor (no numérico, negativo o cero caen al valor por defecto);
- selección de elementos elegibles a partir del inventario y el umbral, descartando los que no tienen fecha de congelación o la tienen en el futuro;
- decisión de a cuáles avisar: nuevos, y los que ya se avisaron hace al menos el periodo de recordatorio;
- normalización y deduplicación de la lista de destinatarios;
- cálculo del tiempo que cada elemento lleva congelado para el contenido del aviso.

Tests primero, cubriendo los casos límite de la spec.

**Cubre:** RF-3, RF-4, RF-6, RF-8, RF-9, RF-9 bis, RF-11, RF-13, RF-19.

### 4. Autorización fiable del proceso

Sustituir la comprobación basada en cabecera y user-agent por la acreditación mediante secreto compartido que el programador de Vercel envía en la cabecera `Authorization` cuando existe `CRON_SECRET`, comparado en tiempo constante. Se mantiene la vía alternativa para una persona autenticada con rol `admin`, corrigiendo la llamada a `isAdmin` para que reciba el cookie store como exige su firma.

Toda respuesta no autorizada es uniforme y no revela si existe congelador ni cuántos elementos hay.

**Cubre:** RF-1, RF-2. **Requiere una variable de entorno nueva: `CRON_SECRET`, solo servidor, configurada en Vercel.**

### 5. Presentación del aviso y ruta como adaptador fino

Trasladar la construcción del asunto y del cuerpo a un módulo de presentación puro, en castellano, con lista única que no distingue primer aviso de recordatorio, y con escape del contenido variable. La ruta queda reducida a: acreditar, leer configuración, consultar el singleton, delegar en el dominio, enviar y registrar.

El envío pasa a estar protegido: si falla, no se registran avisos, se deja constancia del error sin credenciales ni detalles del proveedor, y la respuesta distingue «sin novedades», «aviso enviado» y «fallo». Se elimina `DEFAULT_RECIPIENTS` y cualquier dirección en el código; sin destinatarios configurados no se envía.

Se conserva el modo de comprobación sin envío ni registro, y se revisa el modo de correo de prueba para que siga exigiendo autorización.

**Cubre:** RF-6, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18.

### 6. Alcance singleton y concurrencia

La consulta pasa a resolver primero el congelador único y a limitar los elementos a sus cajones; si no existe congelador, el proceso termina sin avisar y sin error. Para evitar dos correos con los mismos elementos ante ejecuciones solapadas, el registro de avisos se escribe de forma condicional, de modo que la segunda ejecución no encuentre elementos pendientes.

**Cubre:** RF-5, y el caso límite de concurrencia.

### 7. Verificación integral local

Tests focales y `node --test` completo, `npx tsc --noEmit`, `npm run lint`, `npm run build` y `git diff --check`, separando la deuda preexistente. Demostración en local contra el stack aislado: primera ejecución que avisa, segunda que calla, recordatorio simulado adelantando el reloj inyectado, invocación no autorizada, fallo de envío y ausencia de destinatarios. El correo se comprueba en el buzón local.

**Cubre:** criterios de finalización de la spec.

## Archivos previstos y trazabilidad

| Archivo | Acción | RF |
|---|---|---|
| `supabase/migrations/2026…_crear_avisos_congelador.sql` | nuevo | RF-7, RF-9, RF-10 |
| `lib/freezer/freezer-alerts-domain.js` + `.d.ts` | nuevo | RF-3, RF-4, RF-6, RF-8, RF-9, RF-11, RF-19 |
| `lib/freezer/freezer-alerts-presentation.js` + `.d.ts` | nuevo | RF-13, RF-17, RF-18 |
| `lib/freezer/freezer-alerts-server-operations.js` | nuevo | RF-5, RF-7, RF-10, RF-14 |
| `app/api/cron/freezer-alerts/route.ts` | reescritura a adaptador fino | RF-1, RF-2, RF-12, RF-15, RF-16 |
| `tests/unit/lib/freezer-alerts-*.test.js` | nuevos | todos |
| `lib/auth.ts` | sin cambios; se corrige la llamada, no la firma | RF-1 |
| `vercel.json` | sin cambios | — |

## Efectos secundarios y áreas sensibles

- **Supabase y base de datos:** sí. Una migración nueva con tabla y grants restrictivos. Aplicación en remoto manual del usuario.
- **Variables de entorno:** sí. `CRON_SECRET` (nueva, solo servidor) y, opcionalmente, el periodo de recordatorio configurable. Ningún valor se inventa ni se escribe en el repositorio.
- **Vercel y procesos cron:** sí. La ruta programada cambia de comportamiento. `vercel.json` no se modifica.
- **Servicios externos:** sí, el proveedor SMTP. Durante el desarrollo solo se usa el buzón local.
- **Autenticación y autorización:** sí, la de esta ruta. No se tocan los helpers compartidos.
- **APIs:** el contrato de respuesta de esta ruta cambia, al distinguir los tres resultados. **Corrección (T1, 2026-11-15):** la afirmación inicial de que no tenía consumidores era errónea. `app/admin/page.tsx` la invoca por POST en dos acciones, una de prueba (`testEmail: true`) y otra que envía la alerta real (`dryRun: false, testEmail: false`), y consume los campos `ok`, `sent`, `message`, `error`, `eligibleItems`, `thresholdDate` e `items`. **Ese contrato debe preservarse**, o la página de administración debe adaptarse en la misma tarea.
- **OpenAI:** no afecta.

## Riesgos

1. **Orden de despliegue.** Si el código nuevo llega a producción antes de existir `CRON_SECRET` en Vercel, el cron seguirá devolviendo «no autorizado». La variable debe crearse **antes** del despliegue.
2. **Primer aviso masivo.** La primera ejecución correcta avisará de los once elementos acumulados, los más antiguos de hace casi un año. Es el comportamiento esperado, pero conviene saberlo.
3. **Correos reales.** Cualquier descuido al probar contra producción envía correo de verdad. Mitigación: los gates de arriba y el buzón local.
4. **Migración en remoto.** Hasta que el usuario la aplique, el proceso no podrá registrar avisos; el código debe fallar de forma clara, no silenciosa.
5. **Reescritura de una ruta grande.** Se mitiga con tests escritos antes y con la lógica extraída a módulos puros.

## Decisiones y alternativas descartadas

- **Secreto compartido frente a cabecera de Vercel.** Se descarta seguir confiando en `x-vercel-cron` o en el user-agent: son falsificables y, además, es justo lo que hoy está roto.
- **Registrar avisos por elemento, no por ejecución.** Permite el recordatorio individual que pide RF-9 y que un elemento nuevo no quede tapado por un aviso anterior.
- **Borrado en cascada frente a limpieza programada.** La cascada cumple RF-10 sin proceso adicional.
- **No se introduce una tabla de configuración.** El umbral, el recordatorio y los destinatarios siguen siendo variables de entorno, como hoy; una interfaz de configuración está fuera de alcance.
- **No se toca `fecha_caducidad`.** La spec lo deja fuera y ningún elemento tiene el dato.
- **No se corrige `lib/auth.ts`.** Cambiar la firma afectaría a otros consumidores; basta con llamarla correctamente desde esta ruta.
