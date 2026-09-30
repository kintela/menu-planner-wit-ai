## Descripción funcional de la aplicación

Esta aplicación es una aplicación web desarrollada con Next.js y React para la gestión personal y compartida de recetas, menús semanales e inventario de congelador.

La aplicación dispone de autenticación de usuarios. Cada usuario inicia sesión y puede gestionar su propia información dentro del sistema.

Las principales funcionalidades son:

### Recetas

- Cada usuario puede crear sus propias recetas.
- Las recetas pueden consultarse y gestionarse desde la aplicación.
- Las recetas pueden utilizarse posteriormente para construir menús semanales.
- Los usuarios pueden valorar recetas pero no la suya propia.
- Las recetas pueden contener información adicional relacionada con su uso dentro de los menús y otras funcionalidades de la aplicación.
- Antes de modificar el modelo de recetas, revisar las relaciones existentes en Supabase y el flujo de datos utilizado por las páginas y componentes relacionados.

### Menús semanales

La aplicación permite planificar menús semanales utilizando las recetas disponibles.

El menú semanal permite organizar las comidas y cenas de distintos días de la semana.

Las recetas pueden asociarse a elementos del menú y existen contratos de datos entre Supabase, las páginas Server Component y los componentes cliente que deben preservarse.

En particular, `app/recipes/page.tsx` transforma datos relacionados con `menu_items` en `menu_ids` antes de proporcionarlos a `components/recipes-page-client.tsx`.

No modificar este contrato sin comprobar previamente todos sus consumidores.

### Usuarios

La aplicación es multiusuario.

Cada usuario inicia sesión mediante el sistema de autenticación basado en Supabase.

Las operaciones relacionadas con datos de usuario deben respetar siempre:

- autenticación;
- autorización;
- propiedad de los datos;
- roles y permisos existentes.

No asumir que ocultar una funcionalidad en la interfaz de usuario es suficiente para protegerla.

Las comprobaciones de permisos deben realizarse también en servidor.

### Inventario de congelador

La aplicación dispone de una funcionalidad para gestionar el inventario de uno o varios congeladores.

Los congeladores pueden contener cajones y cada cajón puede contener distintos elementos.

Las principales entidades relacionadas son:

- `congeladores`;
- `cajones_congelador`;
- `elementos_cajon`.

Existe además funcionalidad para compartir congeladores entre usuarios.

El sistema contempla niveles de acceso:

- `owner`;
- `editor`;
- `viewer`.

Las APIs relacionadas con congeladores utilizan acceso mediante `service-role` a través de `lib/freezer-access.ts`, junto con comprobaciones explícitas de usuario y permisos.

Debe preservarse también el mecanismo de compatibilidad con propietarios antiguos cuando `congeladores_usuarios` no está disponible.

### Alertas del congelador

La aplicación dispone de un proceso automático relacionado con alertas del congelador.

Vercel ejecuta diariamente:

`/api/cron/freezer-alerts`

según la configuración de `vercel.json`.

Esta funcionalidad puede enviar correos electrónicos reales.

Por este motivo, no ejecutar manualmente ni modificar esta ruta sin revisar previamente sus efectos secundarios.

### Generación mediante inteligencia artificial

La aplicación utiliza OpenAI en determinadas funcionalidades.

Actualmente existe integración en:

`app/api/generate-menu/route.ts`

La clave `OPENAI_API_KEY` debe permanecer exclusivamente en servidor.

Antes de modificar funcionalidades relacionadas con generación mediante IA, revisar:

- el flujo actual;
- los prompts existentes;
- el formato esperado de respuesta;
- el coste potencial;
- la compatibilidad con el resto de la aplicación.

## Objetivo del proyecto

El objetivo de la aplicación es centralizar en una única herramienta la gestión doméstica relacionada con:

- recetas;
- planificación de comidas;
- menús semanales;
- valoración y reutilización de recetas;
- información asociada a cada usuario;
- inventario de congeladores;
- compartición de congeladores entre usuarios;
- alertas y automatizaciones relacionadas.

Cuando se añadan nuevas funcionalidades, deben integrarse respetando este modelo y evitando introducir arquitecturas paralelas innecesarias.

## Guía del repositorio

Este documento define el contexto técnico del proyecto y las reglas que deben seguir los agentes de IA al trabajar sobre este repositorio.

El objetivo es preservar la arquitectura existente, minimizar cambios innecesarios, evitar regresiones y proteger especialmente las áreas sensibles del sistema: autenticación, Supabase, base de datos, variables de entorno, APIs, servicios externos, procesos automáticos y despliegue.

## Comandos y verificación

- Usar `npm` y `package-lock.json`.
- La aplicación utiliza Next.js 16 y React 19, no Next.js 14 como indica actualmente el README.
- `npm run dev` inicia el entorno de desarrollo.
- `npm run build` genera la build de producción.
- `npm start` sirve la build generada.
- `npm run lint` utiliza `scripts/run-eslint.cjs` con ESLint 9 y configuración flat, no `next lint`.
- El wrapper de lint siempre analiza `.` y no reenvía argumentos de archivos.
- Para analizar un archivo concreto utilizar:

```bash
npx eslint path/to/file.tsx
```

- Ejecutar TypeScript de forma independiente con:

```bash
npx tsc --noEmit
```

- `next.config.mjs` desactiva los errores de TypeScript durante el proceso de build.
- Por tanto, que `npm run build` termine correctamente no significa que el proyecto sea type-safe.
- No existe actualmente un script `npm test`.
- Jest está configurado en `jest.config.js`.
- Para ejecutar todos los tests usar:

```bash
npx jest --runInBand
```

- Para ejecutar un archivo concreto:

```bash
npx jest --runInBand --runTestsByPath tests/unit/lib/calories-calculator.test.ts
```

- Para ejecutar un test concreto añadir:

```bash
-t "nombre del test"
```

- Bloqueos actuales conocidos de Jest:
  - `jest-environment-jsdom` no está declarado ni instalado.
  - Tener instalado únicamente `jsdom` no es suficiente.
  - La configuración contiene `moduleNameMapping`, pero la propiedad correcta de Jest es `moduleNameMapper`.
  - `tests/run-tests.ts` hace referencia a scripts npm inexistentes.
- No informar de que los tests pasan correctamente hasta que estos problemas estén resueltos y los tests hayan sido ejecutados realmente.
- Jest descubre únicamente archivos con este patrón:

```text
tests/**/*.test.{js,jsx,ts,tsx}
```

- El directorio `e2e` forma parte actualmente de esta suite Jest y no utiliza un runner independiente de pruebas de navegador.

## Runtime y límites de autenticación

Las variables requeridas en `.env.local` son:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

Las siguientes variables deben permanecer exclusivamente en servidor:

```text
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

Nunca deben exponerse al navegador.

OpenAI se instancia a nivel de módulo en:

```text
app/api/generate-menu/route.ts
```

Por ello, `OPENAI_API_KEY` puede ser necesaria incluso antes de recibir una petición HTTP.

La autenticación en navegador utiliza el singleton definido en:

```text
lib/supabase/client.ts
```

mediante `@supabase/ssr`.

No reemplazarlo por un cliente Supabase basado únicamente en `localStorage`.

Las páginas renderizadas en servidor dependen de cookies de sesión y anteriormente el uso de un cliente basado únicamente en `localStorage` provocó bucles de redirección.

El código de servidor utiliza:

```text
lib/supabase/server.ts
```

Seguir el patrón existente en:

```text
app/recipes/page.tsx
```

Esto implica esperar a `cookies()`, obtener el cookie store y pasarlo a `createClient`.

El archivo:

```text
middleware.ts
```

refresca las cookies de sesión.

No debe considerarse una barrera de autorización.

La autorización debe realizarse explícitamente en las rutas, páginas o servicios correspondientes.

Los siguientes archivos son server-only por convención:

```text
lib/auth.ts
lib/supabase/server.ts
```

Actualmente no tienen un `server-only` import que fuerce esta restricción.

Los Client Components deben utilizar:

```text
lib/auth-client.ts
```

No importar lógica server-only desde componentes cliente.

Los helpers relacionados con roles y permisos están duplicados entre los módulos de autenticación.

Cuando se cambien permisos o roles, revisar ambos para mantenerlos sincronizados.

`app/recipes/page.tsx` carga relaciones desde Supabase y transforma:

```text
menu_items
```

en:

```text
menu_ids
```

antes de pasar los datos a:

```text
components/recipes-page-client.tsx
```

Preservar este contrato de datos cuando se modifique la carga de recetas.

## Base de datos y operaciones

Los cambios de base de datos están definidos mediante scripts SQL independientes dentro de:

```text
scripts/*.sql
```

Actualmente no existe un sistema automático de migraciones configurado.

No asumir que un script SQL existente se ha ejecutado en Supabase.

Antes de modificar comportamiento relacionado con base de datos:

1. Revisar el código que utiliza las tablas afectadas.
2. Revisar los scripts SQL relacionados.
3. Determinar si existe dependencia con cambios manuales realizados anteriormente en Supabase.
4. No asumir automáticamente que la estructura definida en un script coincide con el estado real de producción.

## Congeladores

Las APIs relacionadas con congeladores utilizan acceso mediante `service-role` a través de:

```text
lib/freezer-access.ts
```

Existen comprobaciones explícitas de usuario y permisos.

Preservar los niveles de acceso:

```text
owner
editor
viewer
```

También debe preservarse el mecanismo de compatibilidad con propietarios antiguos cuando:

```text
congeladores_usuarios
```

no está disponible.

El script:

```text
scripts/create-freezer-sharing.sql
```

define la tabla utilizada para compartir congeladores.

Los nombres de tablas y columnas relacionados con esta funcionalidad están en castellano.

Entre ellos:

```text
congeladores
cajones_congelador
elementos_cajon
```

No renombrarlos sin una migración explícita y aprobada.

## Vercel y procesos automáticos

Vercel ejecuta diariamente:

```text
/api/cron/freezer-alerts
```

según la configuración de:

```text
vercel.json
```

con el cron:

```text
0 8 * * *
```

Esta ruta puede enviar correos electrónicos reales.

Antes de ejecutarla manualmente, modificarla o probarla, inspeccionar su implementación y sus posibles efectos secundarios.

La configuración de correo utiliza además:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
```

Tratar estas variables como información sensible.

## Reglas generales de trabajo para agentes de IA

Antes de modificar código:

1. Inspeccionar los archivos relevantes.
2. Entender cómo está implementada actualmente la funcionalidad.
3. Identificar las dependencias relacionadas.
4. Determinar si el cambio afecta a autenticación, Supabase, base de datos, APIs, servicios externos, variables de entorno o despliegue.
5. Evitar modificar código no relacionado con la tarea solicitada.

Preferir siempre cambios pequeños, concretos y localizados.

No realizar refactorizaciones de código no relacionadas con la petición actual.

Preservar:

- la arquitectura existente;
- las convenciones de nombres;
- la estructura de carpetas;
- los contratos de datos;
- el comportamiento existente que no forme parte explícita de la tarea.

No reescribir un archivo completo cuando pueda realizarse un cambio localizado.

Evitar abstracciones especulativas, sobreingeniería o generalizaciones prematuras.

No cambiar una implementación que funciona únicamente por preferencias estilísticas.

## Planificación antes de implementar

Para cambios no triviales, antes de editar código:

1. Analizar la implementación actual.
2. Identificar qué archivos intervienen.
3. Indicar qué archivos será necesario modificar.
4. Explicar brevemente el enfoque propuesto.
5. Identificar posibles efectos secundarios.
6. Indicar expresamente si el cambio afecta a:
   - Supabase;
   - base de datos;
   - autenticación;
   - autorización;
   - variables de entorno;
   - servicios externos;
   - APIs;
   - OpenAI;
   - Vercel;
   - procesos cron.

Cuando existan varias soluciones posibles, preferir la que:

- requiera menos cambios;
- respete mejor la arquitectura actual;
- introduzca menos complejidad;
- introduzca menos dependencias;
- sea más sencilla de mantener.

Para tareas pequeñas y evidentes no es necesario generar un plan extenso, pero sí inspeccionar primero el código relacionado.

## Alcance de los cambios

Modificar únicamente los archivos necesarios para completar la tarea solicitada.

No aprovechar una tarea para:

- reformatear archivos no relacionados;
- renombrar variables sin necesidad;
- reorganizar carpetas;
- cambiar arquitectura;
- actualizar dependencias;
- limpiar código que no afecta a la tarea;
- realizar refactorizaciones generales.

Si durante una tarea se detecta otro problema no relacionado, informar de él pero no corregirlo salvo que sea necesario para completar la tarea solicitada.

## Dependencias

No añadir nuevas dependencias npm sin explicar previamente:

- por qué son necesarias;
- qué problema resuelven;
- si existe ya una dependencia capaz de resolverlo;
- si puede resolverse con APIs nativas de JavaScript, React o Next.js.

No actualizar automáticamente:

- Next.js;
- React;
- Supabase;
- OpenAI SDK;
- ESLint;
- Jest;
- TypeScript;
- librerías principales;
- dependencias con cambios de versión mayor.

Las actualizaciones importantes deben solicitarse explícitamente.

No ejecutar indiscriminadamente:

```bash
npm update
```

ni equivalentes que puedan alterar múltiples dependencias fuera del alcance de la tarea.

## Seguridad de Supabase y base de datos

No modificar sin autorización explícita:

- esquema de Supabase;
- tablas;
- columnas;
- índices;
- relaciones;
- políticas RLS;
- triggers;
- funciones SQL;
- scripts SQL existentes;
- permisos de base de datos.

Nunca asumir que un script dentro de `scripts/` ha sido ejecutado.

Antes de proponer cambios de base de datos, inspeccionar:

- scripts SQL existentes;
- código que utiliza las tablas;
- relaciones utilizadas por Supabase;
- permisos y comprobaciones asociadas.

No eliminar ni debilitar comprobaciones de:

- autenticación;
- autorización;
- propiedad;
- roles;
- permisos.

No utilizar el `service-role` como solución rápida para evitar políticas RLS o problemas de permisos.

## Service Role de Supabase

Nunca exponer:

```text
SUPABASE_SERVICE_ROLE_KEY
```

al cliente.

Nunca utilizarla dentro de:

- Client Components;
- JavaScript enviado al navegador;
- variables `NEXT_PUBLIC_*`;
- respuestas de API;
- logs.

No trasladar operaciones que actualmente requieren `service-role` desde servidor hacia cliente.

Todo acceso mediante `service-role` debe permanecer exclusivamente en código ejecutado en servidor.

## Autenticación

Preservar el flujo actual de autenticación basado en cookies.

No sustituirlo por mecanismos basados únicamente en `localStorage`.

Mantener correctamente separados:

```text
lib/auth.ts
lib/auth-client.ts
lib/supabase/server.ts
lib/supabase/client.ts
```

Antes de modificar permisos, revisar los helpers existentes tanto en servidor como en cliente.

No considerar `middleware.ts` como sustituto de las comprobaciones reales de autorización.

Toda operación protegida debe comprobar los permisos en el servidor, incluso aunque la interfaz de usuario o el middleware oculten o restrinjan el acceso.

No confiar únicamente en comprobaciones realizadas desde React o desde el navegador para proteger datos sensibles.

## Secretos y variables de entorno

Nunca:

- mostrar secretos;
- escribir secretos directamente en código;
- añadir secretos a Git;
- registrar secretos en logs;
- devolver secretos desde una API;
- exponer secretos al navegador.

Nunca colocar secretos de servidor en variables que empiecen por:

```text
NEXT_PUBLIC_
```

Tratar:

```text
.env.local
```

como archivo sensible.

No modificar `.env.local` salvo petición explícita.

Si una nueva funcionalidad necesita una variable de entorno:

1. indicar el nombre propuesto;
2. explicar su finalidad;
3. indicar si es cliente o servidor;
4. indicar dónde debe configurarse;
5. no inventar un valor secreto real.

Nunca incluir secretos reales en ejemplos de código, documentación o respuestas.

## APIs

Antes de modificar una API protegida comprobar:

1. autenticación;
2. autorización;
3. validación de entrada;
4. acceso a Supabase;
5. efectos secundarios;
6. posibles datos sensibles devueltos al cliente.

Preservar los contratos existentes de las APIs salvo petición explícita.

No devolver al navegador:

- stack traces;
- secretos;
- claves;
- credenciales;
- información interna sensible;
- detalles SQL innecesarios.

Antes de modificar una ruta que pueda:

- enviar emails;
- consumir OpenAI;
- modificar datos;
- eliminar datos;
- ejecutar procesos externos;

identificar claramente esos efectos secundarios.

No ejecutar manualmente endpoints con efectos secundarios sobre producción sin autorización explícita.

## OpenAI

Mantener:

```text
OPENAI_API_KEY
```

exclusivamente en servidor.

No exponer la clave al cliente.

Antes de modificar:

```text
app/api/generate-menu/route.ts
```

revisar cómo se instancia y utiliza actualmente el cliente de OpenAI.

Evitar llamadas innecesarias a OpenAI.

No cambiar modelos, parámetros relevantes, prompts principales o arquitectura de integración sin explicar el impacto.

Tener en cuenta el posible impacto de cambios en OpenAI sobre:

- coste;
- latencia;
- formato de respuesta;
- comportamiento de la aplicación;
- compatibilidad con código existente.

## React y Next.js

Respetar los límites entre:

- Server Components;
- Client Components;
- Route Handlers;
- código server-only.

No añadir:

```text
"use client"
```

salvo que sea realmente necesario por funcionalidades como:

- estado React;
- efectos;
- eventos del navegador;
- APIs del navegador;
- interacción exclusivamente cliente.

Mantener lógica server-only fuera del bundle del navegador.

Cuando la arquitectura existente ya utiliza carga de datos en servidor, preferir mantener ese patrón.

Evitar trasladar innecesariamente lógica de servidor hacia componentes cliente.

No introducir llamadas directas a Supabase desde componentes de presentación si actualmente la arquitectura utiliza otra capa para ello.

Mantener separados los componentes de presentación de la lógica sensible siempre que la arquitectura existente lo permita.

## TypeScript

Preservar los tipos existentes.

Evitar:

```typescript
any
```

salvo que exista una razón técnica justificada.

No utilizar `any` simplemente para silenciar errores de TypeScript.

No ocultar problemas de tipos mediante:

```typescript
// @ts-ignore
```

o equivalentes salvo necesidad excepcional y explicada.

Preferir corregir la causa del problema de tipado.

No modificar tipos compartidos sin comprobar previamente qué archivos dependen de ellos.

## Manejo de errores

No ocultar errores importantes mediante bloques `catch` vacíos.

No ignorar promesas rechazadas deliberadamente sin una razón documentada.

Los errores enviados al cliente deben ser comprensibles pero no deben revelar información sensible del servidor.

Cuando se capture un error en servidor, registrar únicamente la información necesaria para diagnosticarlo.

Nunca registrar:

- contraseñas;
- tokens;
- claves API;
- cookies completas;
- service-role keys;
- secretos.

## Verificación de cambios

Después de cambios relevantes ejecutar como mínimo:

```bash
npx tsc --noEmit
```

y:

```bash
npm run lint
```

Para cambios que puedan afectar a:

- compilación;
- routing;
- Server Components;
- Client Components;
- APIs;
- configuración;
- dependencias;
- despliegue;

ejecutar también:

```bash
npm run build
```

Ejecutar Jest cuando la infraestructura de tests correspondiente esté operativa.

Nunca afirmar que:

```text
los tests pasan
```

si los tests no se han ejecutado realmente.

Nunca afirmar que una verificación ha sido realizada si no se ha ejecutado realmente el comando correspondiente.

Si una comprobación falla, indicar:

- qué comando se ejecutó;
- cuál fue el error;
- si el fallo parece provocado por los cambios realizados;
- si el problema ya existía previamente;
- si impide considerar la tarea completamente verificada.

## Tests

Cuando se modifique lógica existente que ya tenga tests, ejecutar los tests relacionados.

Cuando se añada lógica relevante y testeable, considerar si es apropiado añadir tests.

No modificar tests existentes únicamente para conseguir que una implementación incorrecta pase.

Si un test falla debido a que el comportamiento esperado ha cambiado legítimamente, explicar primero por qué debe modificarse el test.

No afirmar que una funcionalidad está cubierta por tests si no existe realmente dicha cobertura.

## Acciones destructivas

No realizar sin autorización explícita:

- eliminación de archivos;
- eliminación de rutas;
- eliminación de funcionalidades;
- eliminación de tablas;
- eliminación de columnas;
- eliminación masiva de datos;
- cambios destructivos de base de datos.

No ejecutar operaciones SQL destructivas como:

```sql
DROP
TRUNCATE
```

o `DELETE` masivos sin autorización explícita.

No ejecutar scripts SQL contra producción sin autorización explícita.

No desplegar automáticamente a producción.

No modificar configuración de producción de Vercel sin autorización explícita.

No eliminar datos de Supabase para realizar pruebas.

## Vercel y producción

No ejecutar despliegues a producción sin autorización explícita.

No modificar variables de entorno de Vercel sin autorización explícita.

No modificar dominios, configuración de producción, cron jobs o ajustes del proyecto de Vercel salvo que formen parte explícita de la tarea.

Antes de modificar `vercel.json`, revisar las consecuencias sobre producción.

Tener especial cuidado con:

```text
/api/cron/freezer-alerts
```

porque puede enviar correos electrónicos reales.

No utilizar producción como entorno de pruebas.

## Git

Mantener los cambios limitados a la tarea solicitada.

No modificar `.gitignore` sin una razón clara.

Nunca añadir al repositorio:

- `.env.local`;
- credenciales;
- tokens;
- claves privadas;
- secretos;
- claves de servicio.

No realizar automáticamente:

```bash
git commit
git push
```

salvo petición explícita.

No realizar `force push`.

No cambiar de rama, crear ramas, hacer merge o rebase salvo que sea necesario para la tarea o se haya solicitado.

No eliminar cambios existentes del usuario.

No sobrescribir modificaciones que no hayan sido realizadas por el agente.

Antes de finalizar una tarea relevante, resumir:

- archivos modificados;
- motivo de cada modificación;
- verificaciones realizadas;
- problemas pendientes.

## Código existente

Antes de crear una nueva utilidad, hook, componente, servicio o helper, buscar si ya existe una implementación equivalente.

Preferir reutilizar código existente antes que duplicar funcionalidad.

No eliminar código aparentemente no utilizado sin verificar previamente si:

- se importa dinámicamente;
- lo utiliza una API;
- lo utiliza un cron;
- depende de él un script;
- existe compatibilidad con funcionalidades antiguas.

Mantener especial cuidado con código de compatibilidad heredado, como el fallback de propietarios antiguos de congeladores.

## Contratos existentes

Preservar los contratos existentes entre:

- Server Components y Client Components;
- APIs y consumidores;
- Supabase y la aplicación;
- componentes padre e hijo;
- funciones y sus consumidores.

No cambiar nombres de propiedades, formatos de respuesta o estructuras de datos sin revisar primero todos sus consumidores.

Preservar especialmente el contrato existente:

```text
menu_items -> menu_ids
```

entre:

```text
app/recipes/page.tsx
```

y:

```text
components/recipes-page-client.tsx
```

## Cambios de arquitectura

No realizar cambios importantes de arquitectura sin explicar primero:

- problema que se intenta resolver;
- arquitectura actual;
- arquitectura propuesta;
- archivos afectados;
- ventajas;
- riesgos;
- posibles incompatibilidades;
- estrategia de migración.

Cambios como los siguientes requieren especial cautela:

- mover autenticación;
- sustituir Supabase;
- modificar el sistema de sesiones;
- reorganizar rutas;
- cambiar Server Components por Client Components;
- introducir nuevas capas de abstracción;
- sustituir librerías principales;
- introducir un ORM;
- cambiar el sistema de migraciones;
- modificar el sistema de permisos.

## Comunicación y toma de decisiones

Si se detecta que una implementación existente parece:

- insegura;
- incorrecta;
- frágil;
- inconsistente;

explicar primero el problema antes de realizar una modificación importante.

Si la petición entra en conflicto con las reglas de este documento, explicar el conflicto antes de continuar.

No asumir requisitos importantes que no hayan sido definidos.

Solicitar aclaración cuando una decisión pueda afectar de forma significativa a:

- arquitectura;
- seguridad;
- autenticación;
- autorización;
- estructura de base de datos;
- contratos de API;
- experiencia visible para el usuario;
- despliegue;
- servicios externos;
- costes asociados a servicios externos.

Para decisiones menores de implementación interna, utilizar la solución más sencilla y coherente con el código existente.

## Forma de trabajar recomendada

Para cambios de cierta importancia, seguir este flujo:

1. Inspeccionar.
2. Comprender.
3. Planificar.
4. Implementar.
5. Verificar.
6. Resumir.

No empezar realizando modificaciones antes de comprender los archivos relacionados.

Cuando el usuario solicite explícitamente primero un análisis o un plan, no modificar ningún archivo hasta recibir autorización para implementar.

## Criterio de finalización de una tarea

Una tarea no debe considerarse terminada únicamente porque el código haya sido escrito.

Cuando corresponda, antes de finalizar:

1. Revisar los cambios realizados.
2. Ejecutar `npx tsc --noEmit`.
3. Ejecutar `npm run lint`.
4. Ejecutar los tests aplicables si están disponibles.
5. Ejecutar `npm run build` cuando sea relevante.
6. Comprobar que no se han introducido secretos.
7. Comprobar que no se han realizado cambios fuera del alcance solicitado.
8. Comprobar que no se ha debilitado autenticación o autorización.
9. Resumir los archivos modificados.
10. Informar de errores, limitaciones o verificaciones que no hayan podido realizarse.

## Resumen final obligatorio tras cambios relevantes

Al finalizar una tarea relevante, informar brevemente de:

- qué se ha cambiado;
- qué archivos se han modificado;
- por qué se han modificado;
- qué verificaciones se han ejecutado;
- si existen errores o advertencias pendientes;
- si existe algún paso manual necesario en Supabase, Vercel o configuración de entorno.

No afirmar que una tarea está completamente verificada si alguna comprobación necesaria no pudo realizarse.

## Memoria del proyecto
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Antes de realizar cambios importantes, consultar `MEMORY.md` para conocer decisiones de arquitectura, problemas conocidos y decisiones pendientes del proyecto.
- Cuando una tarea produzca una decisión técnica relevante y duradera, actualizar `MEMORY.md` al finalizar
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve: resume o elimina lo que ya no aporte.
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md` en lugar de dejarlo en la memoria.
- No guardes nunca datos sensibles (claves, tokens, datos personales).
