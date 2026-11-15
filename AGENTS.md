# Guía del repositorio

Reglas para agentes de IA que trabajan sobre este proyecto. Contiene lo que rompe producción si se ignora y lo que no se puede deducir leyendo el código. Todo lo demás vive en los documentos y skills que se enlazan abajo.

## Qué es esto

Aplicación web multiusuario (Next.js 16, React 19, TypeScript, Supabase, Vercel) para gestión doméstica de recetas, menús semanales e inventario de congeladores, con alertas automáticas y generación de menús mediante OpenAI.

El objetivo es centralizar esa gestión en una sola herramienta. Las nuevas funcionalidades se integran en el modelo existente, sin crear arquitecturas paralelas.

## Antes de tocar nada: dónde está el contexto

Lee primero `MEMORY.md`: estado actual, decisiones vigentes, problemas conocidos y decisiones pendientes. Actualízalo solo cuando cambie la funcionalidad disponible, una decisión de arquitectura, un problema conocido, una decisión pendiente o una integración crítica. No lo uses como historial de commits.

| Si vas a tocar… | Lee antes |
|---|---|
| Specs, planes o tareas de `specs/` | skill `sdd` |
| Esquema, RLS, migraciones, service-role, CLI de Supabase | skill `supabase-db` y `docs/DATABASE.md` |
| Sesiones, cookies, roles, permisos, `lib/auth*`, `lib/supabase/*` | skill `auth` y `docs/AUTH.md` |
| Congeladores, cajones, elementos y sus APIs o UI | skill `congeladores` y `specs/005-*` |
| OpenAI, cron de alertas, `vercel.json`, correo | skill `openai-cron` |
| Arquitectura general y flujos | `docs/ARCHITECTURE.md` |

Las specs SDD viven en `specs/NNN-*/` (`spec.md`, `plan.md`, `tasks.md`) y el estado detallado de cada tarea está en su `tasks.md`.

## Lo que puede causar daño real

- **`/api/cron/freezer-alerts` envía correos de verdad.** Vercel la ejecuta a diario. No la ejecutes, modifiques ni pruebes sin revisar antes sus efectos secundarios.
- **`SUPABASE_SERVICE_ROLE_KEY` y `OPENAI_API_KEY` son exclusivamente de servidor.** Nunca en cliente, en `NEXT_PUBLIC_*`, en respuestas de API ni en logs. No uses el service-role como atajo para esquivar RLS.
- **Nunca asumas que un script de `scripts/*.sql` se ha ejecutado**, ni que coincide con el estado real de producción.
- **No ejecutes operaciones SQL destructivas** (`DROP`, `TRUNCATE`, `DELETE` masivos) ni scripts contra producción sin autorización explícita. No borres datos de Supabase para hacer pruebas.
- **No despliegues a producción** ni modifiques su configuración en Vercel sin autorización explícita. No uses producción como entorno de pruebas.
- **No elimines archivos, rutas, funcionalidades, tablas o columnas** sin autorización explícita.
- Nunca muestres, codifiques, registres ni subas a Git secretos de ningún tipo. Trata `.env.local` como archivo sensible y no lo modifiques salvo petición explícita.

## Secretos

Si una funcionalidad necesita una variable de entorno nueva: indica el nombre propuesto, su finalidad, si es de cliente o de servidor y dónde debe configurarse. No inventes un valor secreto real ni lo incluyas en ejemplos.

Variables requeridas en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

## Comandos y verificación

- `npm` y `package-lock.json`. `npm run dev`, `npm run build`, `npm start`.
- **`npm run lint` usa `scripts/run-eslint.cjs`, no `next lint`.** El wrapper analiza siempre `.` y **no reenvía argumentos de archivo**. Para un archivo concreto: `npx eslint path/to/file.tsx`.
- **`next.config.mjs` desactiva los errores de TypeScript en build: que `npm run build` termine bien NO significa que el proyecto sea type-safe.** Ejecuta `npx tsc --noEmit` aparte. Arrastra deuda preexistente ajena a tu cambio.
- **El gate real de tests es `node --test`.** No existe script `npm test`.
- **Jest está roto y no debe considerarse fiable:** falta `jest-environment-jsdom`, la configuración usa `moduleNameMapping` en vez de `moduleNameMapper` y `tests/run-tests.ts` referencia scripts inexistentes. Jest solo descubre `tests/**/*.test.{js,jsx,ts,tsx}`, y `e2e` forma parte de esa suite sin runner de navegador propio.

Tras cambios relevantes ejecuta al menos `npx tsc --noEmit` y `npm run lint`; añade `npm run build` si afectan a compilación, routing, componentes, APIs, configuración, dependencias o despliegue.

**Nunca afirmes que una verificación se ha hecho si no has ejecutado el comando, ni que los tests pasan si no se han ejecutado realmente.** Si una comprobación falla, di qué comando ejecutaste, cuál fue el error, si lo causó tu cambio o ya existía, y si impide dar la tarea por verificada.

## Contratos que no se rompen

- **`menu_items -> menu_ids`**: `app/recipes/page.tsx` transforma los datos antes de pasarlos a `components/recipes-page-client.tsx`. No cambies ese contrato sin revisar todos sus consumidores.
- Los nombres de tablas y columnas de congeladores están **en castellano** (`congeladores`, `cajones_congelador`, `elementos_cajon`). No renombrar sin migración aprobada.
- Preserva los contratos existentes entre Server y Client Components, entre APIs y consumidores, y entre Supabase y la aplicación. No cambies nombres de propiedades ni formatos de respuesta sin revisar antes quién los consume.
- No elimines código aparentemente no usado sin comprobar si lo importa algo dinámicamente, una API, un cron o un script, o si da compatibilidad con funcionalidad antigua. Ten especial cuidado con el fallback de propietarios históricos de congeladores.

## Autorización

Las comprobaciones de permisos se hacen **en servidor**. Ocultar una funcionalidad en la interfaz no la protege, y `middleware.ts` refresca cookies pero no es una barrera de autorización. No elimines ni debilites comprobaciones de autenticación, autorización, propiedad, roles o permisos.

Las APIs no devuelven al navegador stack traces, secretos, credenciales, información interna ni detalles SQL innecesarios. Antes de modificar una API protegida, comprueba autenticación, autorización, validación de entrada, acceso a datos, efectos secundarios y qué información sensible podría devolver.

## Alcance del trabajo

Antes de modificar código, inspecciona los archivos implicados y entiende cómo funciona hoy. Modifica solo lo necesario para la tarea: no reformatees archivos ajenos, no renombres sin motivo, no reorganices carpetas ni actualices dependencias de paso. Si detectas otro problema, **infórmalo pero no lo corrijas** salvo que sea necesario para completar la tarea.

No añadas dependencias npm sin explicar antes por qué son necesarias y si puede resolverse con lo ya instalado o con APIs nativas. No actualices Next.js, React, Supabase, el SDK de OpenAI, ESLint, Jest, TypeScript ni otras librerías principales por iniciativa propia, ni ejecutes `npm update` o equivalentes.

Para cambios no triviales, antes de editar: explica la implementación actual, qué archivos tocarás, el enfoque propuesto, los efectos secundarios y si afecta a Supabase, base de datos, autenticación, autorización, variables de entorno, servicios externos, APIs, OpenAI, Vercel o procesos cron. Cuando haya varias soluciones, elige la que requiera menos cambios y respete mejor la arquitectura actual.

**Si el usuario pide primero un análisis o un plan, no modifiques ningún archivo hasta tener autorización para implementar.**

## Git

Mantén los cambios limitados a la tarea. No hagas `commit`, `push`, `force push`, cambios de rama, merge ni rebase salvo petición explícita o necesidad real. No elimines ni sobrescribas cambios del usuario. Nunca subas `.env.local`, credenciales, tokens, claves privadas ni secretos.

## Al terminar una tarea relevante

Resume qué has cambiado, qué archivos y por qué, qué verificaciones has ejecutado con su resultado, qué errores o advertencias quedan y si hace falta algún paso manual en Supabase, Vercel o configuración de entorno.

No des por terminada una tarea solo porque el código esté escrito, y no afirmes que está completamente verificada si alguna comprobación necesaria no pudo hacerse.

## Si algo contradice estas reglas

Si una petición entra en conflicto con este documento, o si encuentras una implementación que parece insegura, incorrecta o frágil, explica el conflicto antes de continuar. Pide aclaración cuando una decisión afecte de forma significativa a arquitectura, seguridad, autenticación, autorización, estructura de datos, contratos de API, experiencia de usuario, despliegue, servicios externos o costes. Para decisiones menores de implementación interna, elige la opción más simple y coherente con el código existente.
