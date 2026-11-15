---
name: openai-cron
description: Úsala antes de tocar la generación con OpenAI (app/api/generate-menu), el cron de alertas (app/api/cron/freezer-alerts), vercel.json o la configuración de correo y despliegue
---
# OpenAI, cron y despliegue

Dos rutas de este proyecto tienen efectos secundarios reales y caros. Trátalas con cuidado explícito.

## `/api/cron/freezer-alerts` — envía correos reales

Vercel la ejecuta a diario (`0 8 * * *` en `vercel.json`).

- **No la ejecutes manualmente, ni la modifiques ni la pruebes sin revisar antes sus efectos secundarios.**
- No ejecutes endpoints con efectos secundarios contra producción sin autorización explícita.
- No está adaptada al modelo de congelador único de la spec 005; ese trabajo pertenece a la **spec 007**, aún sin redactar.

Variables de correo, todas sensibles: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`.

## `/api/generate-menu` — consume OpenAI

El cliente de OpenAI **se instancia a nivel de módulo**, así que `OPENAI_API_KEY` puede hacer falta incluso antes de que llegue una petición HTTP. La clave es exclusivamente de servidor.

Antes de modificar la ruta, revisa el flujo actual, los prompts existentes, el formato de respuesta esperado, el coste potencial y la compatibilidad con el resto de la aplicación. Evita llamadas innecesarias.

No cambies modelo, parámetros relevantes, prompts principales ni la arquitectura de integración sin explicar antes el impacto en coste, latencia, formato de respuesta y comportamiento.

## Vercel y producción

- No despliegues a producción sin autorización explícita.
- No modifiques variables de entorno, dominios, cron jobs ni ajustes del proyecto en Vercel salvo que formen parte explícita de la tarea.
- Antes de tocar `vercel.json`, revisa las consecuencias sobre producción.
- No uses producción como entorno de pruebas.

## Variables de entorno

Requeridas en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` y `OPENAI_API_KEY` nunca deben llegar al navegador. Si una funcionalidad necesita una variable nueva: indica nombre, finalidad, si es de cliente o servidor y dónde configurarla. No inventes un valor secreto real.
