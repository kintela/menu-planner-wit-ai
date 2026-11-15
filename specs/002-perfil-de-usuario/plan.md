# Plan — Perfil de usuario

## Estado y gate de aprobación

La spec RF-1–RF-15 está aprobada. Este plan sustituye al anterior después de que T1 confirmara en Supabase local que no existe el bucket `avatars` ni sus policies y que `user_profiles` permite lectura amplia a `anon` y `authenticated`. Ese hallazgo ya no es una duda de alcance: RF-10–RF-14 exigen corregirlo mediante una migración formal posterior a la baseline, conservando los datos y validándola primero en local.

**Gate obligatorio:** este plan actualizado debe recibir aprobación explícita antes de crear o editar SQL, ejecutar migraciones o comenzar la implementación. La aprobación de la spec no sustituye la aprobación del plan. No se conectará, inspeccionará ni operará ningún Supabase remoto; el usuario aplicará y registrará manualmente las migraciones remotas en una fase independiente.

## Estado actual inspeccionado

- T1 quedó completada como inspección local de solo lectura. La baseline `20261024000000_baseline.sql` crea las policies `user_profiles delete own`, `user_profiles insert own`, `user_profiles select anon`, `user_profiles select own` y `user_profiles update own`; las dos policies de lectura usan `USING (true)`. RLS está habilitado, pero los grants a `anon` y `authenticated` son amplios.
- El stack local no contiene el bucket `avatars` ni policies para `storage.objects` o `storage.buckets`. La baseline tampoco los define. El prefijo `<auth.uid()>/...` usado por la UI no acredita propiedad mientras Storage no lo imponga.
- `app/profile/page.tsx` y `components/user-profile-form.tsx` autentican y operan desde navegador. El formulario carga, modifica perfil y Auth, sube a `avatars/<profile.id>/...`, acepta una URL como referencia y borra el avatar anterior antes de asociar el nuevo. No ofrece eliminación/restablecimiento explícito.
- `GET app/api/profile/route.ts` deriva el usuario autenticado, pero lee con service-role, omite RLS y expone mensajes internos de Supabase. No hay rutas de escritura, email ni avatar.
- `components/auth/auth-provider.tsx` y las navegaciones consumen `avatar_url`; recetas y menús consumen relaciones de `user_profiles`. Al restringir lectura, esos consumidores deben tolerar relación/perfil no visible sin reabrir datos personales. Se preservará el nombre del campo `avatar_url`, pero una referencia almacenada no se tratará como autorización.
- `user_restricted` puede gestionar su propio perfil. En esta funcionalidad, ningún rol —incluido administrador— puede leer ni modificar perfiles ajenos.
- La autoridad documental aplicable está repartida entre `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`, junto con `AGENTS.md` y `MEMORY.md` como referencias operativas.

## Enfoque técnico y orden

### 1. Migración mínima, segura e idempotente

Después del gate de aprobación, volver a inspeccionar los nombres efectivos de policies y el catálogo local inmediatamente antes de redactar la migración. Crear una única migración nueva y ordenada en `supabase/migrations/`, posterior a la baseline y sin modificarla. La migración deberá:

- sustituir de forma explícita y repetible las policies de lectura amplia de `public.user_profiles` por acceso `id = auth.uid()` para el propietario autenticado, conservando las policies propias de escritura que ya cumplan esa condición y ajustando grants únicamente en lo necesario;
- crear o configurar `avatars` como bucket privado, sin borrar ni reescribir objetos, perfiles o referencias existentes;
- definir policies de `storage.objects` para `SELECT`, `INSERT`, `UPDATE` y `DELETE` limitadas al bucket `avatars`, al rol autenticado y a que el primer segmento de `name` coincida con `auth.uid()`; una URL o path aportado no sustituye esa comprobación;
- usar nombres estables y guardas de existencia compatibles con el catálogo real para que una reaplicación controlada alcance el mismo estado sin pérdida de datos;
- no añadir acceso administrativo ni service-role como vía de la feature, no crear bucket público y no tocar policies ajenas.

Primero ejecutar previsualización local explícita (`supabase db push --dry-run --local`, si la CLI instalada lo admite y el destino local está confirmado); después aplicar únicamente al stack local aislado y validar catálogo, datos conservados y matriz de acceso. No usar `link`, `--linked`, `--db-url` ni comandos remotos. La aplicación/registro remoto queda como paso manual futuro del usuario.

### 2. Dominio puro y contratos

Incorporar lógica pura pequeña y testeable, sin acceso a reloj global:

- `buildProfileUpdate(input, hoy)`: normaliza los campos permitidos, deriva `full_name` y recibe `hoy` explícitamente para `updated_at` si este se envía desde aplicación.
- `buildAvatarObjectPath(userId, fileName, hoy)`: construye una ruta bajo el prefijo propio; cualquier sufijo temporal depende de `hoy` inyectado.
- `parseOwnedAvatarReference(reference, userId)`: obtiene una ruta canónica solo si pertenece al bucket esperado y comienza por el `userId` autenticado; rechaza URLs/rutas arbitrarias o ambiguas.
- `classifyEmailChange(authResult)`: representa aceptación, confirmación pendiente o rechazo sin marcar prematuramente el correo como confirmado.

Mantener `avatar_url` como propiedad contractual. En persistencia contendrá una referencia canónica propia; para presentación, el servidor podrá devolver una URL temporal resuelta sin convertirla en prueba de ownership. Las referencias históricas no acreditables se conservan, pero no se leen, sustituyen ni borran; la interfaz muestra fallback.

### 3. Frontera de servidor del perfil

Usar el cliente SSR con cookies y credenciales de usuario para que las operaciones permanezcan sujetas a RLS. Eliminar del flujo de perfil el bypass con service-role. En `app/api/profile/route.ts`, preservar `{ profile }` en lectura, derivar siempre el ID de `auth.getUser()`, no aceptar un ID objetivo y devolver errores públicos sin mensajes SQL/internos. Añadir la escritura del propio perfil en la misma frontera o en una ruta hermana solo si mejora la claridad del contrato.

`app/profile/page.tsx` mantendrá la pantalla y `ChangePasswordForm` sin ampliar el alcance. `components/user-profile-form.tsx` pasará a consumir las operaciones protegidas y mostrará estados separados de carga, éxito, confirmación pendiente, rechazo y fallo parcial. `user_restricted` no se filtra por rol; propiedad y sesión son las reglas.

### 4. Cambio de correo mediante Auth

La operación de email actuará sobre la identidad de la sesión mediante Supabase Auth y sus cookies, separada del resultado de los demás campos. Una aceptación que requiera confirmación se mostrará como pendiente y no actualizará la presentación como correo confirmado hasta que Auth lo confirme. Un rechazo no ocultará ni revertirá otros campos ya guardados. No se cambia la configuración de confirmación del proveedor.

### 5. Ciclo seguro del avatar

Las operaciones de avatar se realizarán con el cliente Supabase de la sesión, nunca con service-role. El servidor derivará `user.id`, construirá/validará el prefijo y no aceptará una URL como autoridad.

- **Carga inicial:** validar archivo según reglas visibles existentes, subir bajo `<user.id>/...` y asociar la referencia canónica propia.
- **Reemplazo:** cargar primero el nuevo objeto, asociarlo correctamente al perfil y solo entonces intentar borrar el objeto anterior si su propiedad está acreditada. Si falla carga o asociación, conservar objeto y referencia anteriores; se podrá limpiar el objeto nuevo propio como compensación, sin tocar el anterior. Si falla únicamente el borrado posterior, mantener la nueva asociación e informar limpieza parcial.
- **Eliminar/restablecer:** acreditar la referencia propia, eliminar solo ese objeto y limpiar `avatar_url`; si no hay avatar, dejar fallback. Cada resultado parcial se comunica sin éxito total. Una referencia histórica no acreditable se conserva sin acceso destructivo y produce fallback/error seguro.

Tras el cambio, sincronizar `AuthProvider`/navegación con el perfil devuelto o el evento vigente, evitando listados exploratorios del bucket y URLs públicas. Los demás consumidores conservarán su forma de datos y tolerarán `user_profiles` o avatar no visibles.

## Archivos previstos y RF cubiertos

| Parte / archivos previstos | Responsabilidad | RF |
|---|---|---|
| `supabase/migrations/<nueva>_secure_user_profiles_and_avatars.sql` | Corregir policies nominales de perfil; crear/configurar bucket privado y policies owner-only sin borrar datos | RF-7, RF-8, RF-10–RF-14 |
| `lib/profile/*` (solo helpers necesarios) | Normalización, `hoy` explícito, path canónico y clasificación de resultados | RF-2–RF-6, RF-9, RF-11, RF-12, RF-15 |
| `app/api/profile/route.ts` y, si se separan por efecto, rutas bajo `app/api/profile/` | Sesión SSR, lectura/escritura propia, Auth email y avatar con cliente de usuario | RF-1–RF-15 |
| `app/profile/page.tsx`, `components/user-profile-form.tsx` | Presentación en español, fallback, confirmación pendiente y fallos parciales | RF-1–RF-6, RF-9, RF-15 |
| `components/auth/auth-provider.tsx`, `components/simple-navigation.tsx` y solo consumidores afectados | Sincronización y tolerancia a perfil/avatar no visible sin ampliar acceso | RF-1, RF-4–RF-9, RF-12, RF-13 |
| Tests unitarios/de rutas compatibles con `node --test` y comprobaciones locales de migración | Evidencia de dominio, endpoints y matriz owner/other/anon/admin | RF-1–RF-15 |

Los nombres finales de rutas/helpers se fijarán al implementar tras revisar consumidores; no se crearán capas paralelas ni se modificarán archivos no necesarios.

## Decisiones y alternativas descartadas

- **Migración versionada posterior a baseline:** se elige una migración nueva, local-first e idempotente; se descarta editar la baseline, usar scripts históricos o asumir el estado remoto, porque rompería trazabilidad y RF-14.
- **Bucket privado owner-only:** se eligen paths canónicos y acceso autenticado sujeto a policies; se descarta bucket público/getPublicUrl, porque RF-11–RF-13 prohíben lectura de terceros y una URL no prueba propiedad.
- **Cliente de sesión y RLS:** se elimina el bypass service-role del perfil; se descarta mantenerlo acompañado solo de checks de aplicación, porque la spec exige mínimo privilegio y prohíbe eludir los controles.
- **Propiedad por identidad y primer segmento:** se deriva el ID de Auth y se valida el prefijo; se descarta aceptar IDs, paths o URLs del cliente como autoridad.
- **Reemplazo upload → asociación → borrado:** se descarta borrar primero el avatar anterior, porque un fallo dejaría al usuario sin el estado vigente y violaría RF-15.
- **Email como estado de Auth:** se descarta escribir el correo solicitado como confirmado en `user_profiles` antes de la confirmación del proveedor.
- **Administradores sin excepción:** se descarta reutilizar privilegios de rol para perfiles ajenos; esta feature es exclusivamente propia, también para admins.
- **Compatibilidad conservadora:** se mantienen datos/referencias históricas y contratos de propiedades; se descarta sanear mediante borrado o conceder acceso para “recuperarlas”.

## Estrategia de pruebas y gates de coordinación

Cada implementador seguirá TDD en su subtask: primero añadirá una prueba focalizada que falle por el comportamiento ausente, luego implementará el mínimo cambio y la dejará verde. Priorizar tests unitarios de las funciones puras y tests de Route Handlers con Auth/Supabase inyectados o simulados; cubrir éxito, sesión ausente, usuario distinto/admin, `user_restricted`, URL/path ajeno, fallos parciales y confirmación de email.

Tras cada entrega de implementación, el coordinador ejecutará `node --test` como gate obligatorio y se detendrá si falla. Los tests nuevos deberán usar un formato que el `node --test` disponible ejecute realmente, sin nuevas dependencias; no se afirmará cobertura de perfil por los dos tests generales históricos que no cubren esta feature. Jest sigue bloqueado por `jest-environment-jsdom`, `moduleNameMapping` y scripts inexistentes, por lo que no se condicionará esta feature a declarar Jest operativo ni se corregirá esa infraestructura fuera de alcance.

Para la migración, además del gate `node --test`, la evidencia local incluirá dry-run, aplicación local, reejecución/idempotencia segura y matriz de acceso: owner permitido; anon, otro autenticado y admin de aplicación denegados; prefijo ajeno denegado; datos y objetos preexistentes no eliminados. No se usarán datos remotos.

Al cierre ejecutar y registrar:

1. `node --test` focal y general;
2. `npx tsc --noEmit`;
3. `npm run lint` (y `npx eslint <archivos>` durante iteraciones si ayuda);
4. `npm run build`, por afectar rutas, Server/Client Components y APIs;
5. validación funcional local de perfil, Auth email y avatar únicamente en el stack aislado, sin envíos ni operaciones remotas no autorizadas.

## Riesgos y manejo

- Restringir `user_profiles` puede hacer nulas relaciones usadas para autores de recetas/menús. Revisar esos consumidores y conservar su forma/fallback sin reintroducir lectura de datos personales.
- Un bucket privado invalida URLs públicas históricas. Conservar la referencia, no usarla como autorización y mostrar fallback si no puede acreditarse; no hacer migración destructiva de objetos.
- Storage y tabla no comparten transacción. Aplicar el orden de RF-15 y respuestas de éxito parcial; nunca borrar el anterior antes de asociar el nuevo.
- El cambio de correo puede quedar pendiente o fallar independientemente del perfil. Mantener resultados diferenciados y comprobar el estado confirmado que exponga Auth.
- Una migración aparentemente idempotente puede colisionar con nombres/policies distintos en otro entorno. Inspeccionar únicamente el local autorizado, limitar cambios a nombres efectivos/bucket objetivo y dejar al usuario la revisión/aplicación remota manual.
- La presencia de la migración no demuestra aplicación local ni remota. Registrar por separado comandos y resultados, sin secretos ni datos personales.
