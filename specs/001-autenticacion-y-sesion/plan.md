# Plan — Autenticación y sesión

## Alcance y enfoque

Registrar el estado real de ejecución de T1–T9 frente a la spec aprobada. T1–T8 están completadas como análisis retrospectivo. T9 está parcialmente completada: la migración `20261024010000_install_user_profile_trigger.sql` fue creada y aplicada exclusivamente en Supabase local `menu-planner-wit-ai`; el signup y perfil `user_restricted` se verificaron localmente. No queda pendiente crear, volver a aplicar ni resetear la migración o el stack.

Las operaciones Auth de proveedor local (signup, login/identidad, actualización de contraseña, nuevo login y logout) fueron comprobadas, pero no acreditan la UI ni el flujo de la aplicación. T9 permanece parcial/bloqueada por validaciones funcionales pendientes y limitaciones de tests. No se cambiarán spec, SQL, configuración, base de datos ni código en esta actualización documental.

## Partes, referencias, decisiones y cobertura

| Parte | Trabajo/estado actual y siguiente acción | Requisitos |
|---|---|---|
| P1. Registro y perfil | Completado: migración aplicada en local; signup y perfil con rol `user_restricted` observados. | RF-1, RF-2 |
| P2. Inicio e identidad | Proveedor Auth local comprobado. Pendiente prueba en UI de la aplicación: mensajes, renderizado/consumo de identidad y navegación. | RF-1, RF-3, RF-4 |
| P3. Cierre de sesión | Logout e invalidación de token comprobados en proveedor. Pendiente UI: limpieza de estado usuario/perfil y navegación a `/login`, incluyendo el flujo de aplicación. | RF-5 |
| P4. Callback y recovery | Sin validación funcional. Gate SMTP local confirmado hacia Inbucket interno (puerto 1025); recovery pendiente porque no se ejecutó ni hay captura/evidencia. Solicitud/envío de recovery sigue fuera de alcance. | RF-6, RF-10, RF-11 |
| P5. Nueva contraseña | Actualización de contraseña del proveedor comprobada; no sustituye prueba de la pantalla. Pendiente validar UI, confirmación/no coincidencia, mínimo de seis caracteres, aceptación y retardo, y acceso sin sesión. | RF-7–RF-9, RF-12 |
| P6. Condiciones transversales | Evidencia estática sobre cookies/cliente-servidor y límites de autorización; no equivale a validación funcional UI. | NFR; RF-4–RF-6, RF-12 |
| P7. Pruebas automatizadas | `node --test` general: 2/2, sin cobertura de auth. Test TS objetivo bloqueado por `ERR_UNKNOWN_FILE_EXTENSION`; Jest no inicia por `jest-environment-jsdom` ausente y configuración `moduleNameMapping` inválida. Resolver infraestructura antes de usar esas suites como evidencia. | RF-1–RF-12 |

## Decisiones y alternativas descartadas

- **Migración local:** la migración posterior a baseline fue creada y aplicada en el stack local autorizado. Descartado planificar su aplicación futura, repetirla o resetear el stack: esos pasos ya ocurrieron y no son necesarios.
- **Estado remoto:** el usuario informó que siempre aplica/registra manualmente migraciones remotas y aportó captura de `supabase migration list --linked` que muestra Remote con `20261024000000` y `20261024010000`. Se registra como operación manual del usuario, no del agente. No se realizó ninguna acción remota en esta actualización documental.
- **Gate remoto permanente:** los agentes no operan sobre Supabase remoto/producción sin autorización explícita futura e independiente. La actividad remota referida no autoriza acciones posteriores.
- **SMTP/recovery:** configuración efectiva local comparada y confirmada con host Inbucket interno y puerto 1025. No se envió correo ni se ejecutó recovery; RF-6/RF-10/RF-11 quedan pendientes por falta de prueba/captura, no por el gate SMTP.
- **Alcance funcional:** mantener RF-5, RF-10 y RF-11 según el comportamiento esperado aprobado; RF-6 se limita exclusivamente al procesamiento de callback de recuperación. No incluir solicitud/envío del correo ni otros callbacks.
- **Tiempo:** toda función pura de evaluación temporal que se proponga debe recibir explícitamente `hoy`/instante de referencia; no depender del reloj implícito.
- **Pruebas:** los dos tests generales no son de auth. No afirmar cobertura funcional por tests automatizados fallidos/no ejecutables; conservar los bloqueos hasta resolverlos.

## Archivos y elementos afectados

- Migración local ya creada/aplicada: `supabase/migrations/20261024010000_install_user_profile_trigger.sql`; no modificar ni volver a aplicar.
- UI a validar, sin cambios previstos en esta fase: `components/auth/login-form.tsx`, `app/login/page.tsx`, `components/auth/auth-provider.tsx`, `components/simple-navigation.tsx`, `app/auth/callback/route.ts` y `app/auth/reset-password/page.tsx`.
- Infraestructura de tests a diagnosticar/resolver antes de ejecutar suites correspondientes: configuración Jest, dependencia `jest-environment-jsdom` y ejecución directa de test TypeScript con `node --test`.
- Supabase remoto, SQL, configuración y base de datos no son objetivos de esta actualización; ninguna operación remota queda autorizada.

## Acciones pendientes y orden de validación

1. **Diagnosticar el fallo de UI local (siguiente acción):** el intento de UI ya se ejecutó y falló mostrando `Failed to fetch`; en la lista de red no hubo request a Supabase local. Diagnosticar la causa de ese fallo antes de reintentar la validación UI. No repetir recovery salvo que sea necesario para obtener evidencia pendiente. No alterar configuración sin autorización.
2. **Validar UI local de aplicación:** ejecutar la aplicación contra el Supabase local ya existente, sin resetearlo ni reaplicar migraciones. Probar signup/login/identidad/logout y registrar mensajes, estado cliente y navegación para RF-1–RF-5. No usar credenciales reales ni servicios remotos.
3. **Validar recovery, pendiente:** el gate SMTP ya está confirmado. Si se necesita completar la evidencia, y sólo con cuenta/enlace local desechable, probar el procesamiento de callback de recuperación válido, expiración y fallo para RF-6, RF-10 y RF-11. No volver a solicitar recovery salvo necesidad de obtener evidencia; solicitud/envío sigue fuera del alcance funcional.
4. **Validar UI de nueva contraseña:** en aplicación local, probar RF-7–RF-9 y RF-12, incluyendo sesión requerida, contraseña/confirmación no coincidentes, menos de seis caracteres, actualización aceptada y retardo de 2 segundos. No expandir RF-6 más allá de recovery.
5. **Resolver bloqueos de tests:** corregir/autorizar por separado lo necesario para que Jest pueda iniciar (`jest-environment-jsdom` y opción `moduleNameMapper`) y establecer una forma compatible de ejecutar el test TypeScript objetivo; ejecutar sólo pruebas aplicables y registrar comandos/resultados. Los tests generales `node --test` no sustituyen pruebas de autenticación.
6. **Cerrar evidencia T9:** actualizar estado por RF y limitaciones sólo después de ejecutar las validaciones posibles; conservar como no validados los casos bloqueados. No operar sobre Supabase remoto sin autorización explícita futura.

## Riesgos y límites

- El gate SMTP local está confirmado hacia Inbucket interno (puerto 1025). No se envió correo; recovery sigue pendiente porque no se ejecutó y no hay captura/evidencia.
- Las pruebas del proveedor local no validan interfaz, mensajes, navegación ni estado de sesión en la aplicación.
- RF-6, RF-10 y RF-11 siguen sin validación funcional; RF-7–RF-9 y RF-12 siguen sin prueba UI. RF-5 permanece pendiente de validación UI aunque logout del proveedor sí esté comprobado.
- `node --test` general 2/2 no cubre autenticación. El test TypeScript objetivo falla con `ERR_UNKNOWN_FILE_EXTENSION`; Jest no inicia por dependencia ausente y propiedad de configuración inválida.
- La evidencia remota procede de la declaración del usuario y su captura de lista de migraciones; no equivale a prueba funcional remota ni a acción del agente.
- Se preservan las limitaciones y gaps de implementación/evidencia documentados en `spec.md`; no se concluye que la funcionalidad completa esté validada.

## Trazabilidad

RF-1/RF-2: P1 y P2; RF-3/RF-4: P2 y P6; RF-5: P3 y P6; RF-6/RF-10/RF-11: P4; RF-7–RF-9/RF-12: P5 y P6. P7 aporta evidencia automatizada complementaria únicamente cuando las pruebas puedan ejecutarse. T1–T8 completadas; T9 parcial según evidencias y siguientes acciones descritas arriba; gate SMTP confirmado y diagnóstico UI local es la siguiente acción.
