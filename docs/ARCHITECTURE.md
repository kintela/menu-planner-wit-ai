# Arquitectura

## Visión general

La aplicación utiliza Next.js 16 con React 19 y TypeScript. Supabase proporciona persistencia y autenticación; Vercel aloja la aplicación y ejecuta tareas programadas; OpenAI genera propuestas de menú.

```text
Navegador
  -> Next.js (Server Components y Client Components)
  -> Route Handlers
       -> Supabase
       -> OpenAI
       -> SMTP

Vercel Cron
  -> /api/cron/freezer-alerts
       -> Supabase
       -> SMTP
```

La lógica que requiere secretos, privilegios elevados o autorización real debe permanecer en servidor.

## Capas y responsabilidades

### Interfaz

- Los Server Components pueden cargar datos y trabajar con la sesión del servidor.
- Los Client Components se reservan para estado, efectos, eventos y APIs del navegador.
- Añadir `"use client"` amplía el código enviado al navegador y no debe utilizarse para resolver límites de arquitectura.

### APIs

Los Route Handlers encapsulan operaciones del servidor, integraciones externas y efectos secundarios. Una ruta protegida debe validar autenticación, autorización y entrada aunque el acceso también esté restringido en la interfaz o en middleware.

Antes de cambiar una respuesta de API, deben revisarse todos sus consumidores para preservar el contrato existente.

### Supabase

Supabase se usa como base de datos y proveedor de autenticación. Los clientes de navegador y servidor están separados; el flujo concreto se documenta en `docs/AUTH.md`.

### OpenAI

La generación de menús reside en:

```text
app/api/generate-menu/route.ts
```

El cliente de OpenAI se instancia a nivel de módulo y depende de `OPENAI_API_KEY` en servidor. La variable puede ser necesaria durante la carga del módulo, antes de atender una petición.

Los cambios de modelo, prompt, parámetros o formato deben considerar:

- coste y latencia;
- estabilidad del formato de respuesta;
- validación de la salida;
- compatibilidad con los consumidores actuales.

## Flujos principales

### Recetas y menús

Cada usuario puede gestionar sus recetas y valorar recetas de otros usuarios, pero no las propias. Las recetas se utilizan en la planificación de menús semanales.

`app/recipes/page.tsx` carga desde Supabase una relación denominada `menu_items` y la transforma en `menu_ids` antes de entregar los datos a:

```text
components/recipes-page-client.tsx
```

`menu_ids` es el contrato consumido por la capa cliente. Cambiar la consulta o la transformación exige revisar toda la cadena de consumidores.

### Inventario de congeladores

El inventario se organiza en congeladores, cajones y elementos. Los congeladores pueden compartirse mediante roles `owner`, `editor` y `viewer`.

Las APIs de congeladores centralizan acceso privilegiado y comprobaciones explícitas en:

```text
lib/freezer-access.ts
```

La estructura de datos y la compatibilidad heredada se describen en `docs/DATABASE.md`; el modelo de autorización, en `docs/AUTH.md`.

### Alertas automáticas

Vercel ejecuta la ruta:

```text
/api/cron/freezer-alerts
```

La programación definida en `vercel.json` es:

```cron
0 8 * * *
```

La ruta puede consultar inventario y enviar correos reales mediante SMTP. Cualquier cambio debe revisar idempotencia, destinatarios, zona horaria, manejo de fallos y riesgo de envíos duplicados. No debe ejecutarse manualmente contra producción como forma de prueba.

Variables de correo utilizadas:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
```

## Configuración y despliegue

- npm es el gestor de paquetes y `package-lock.json` debe mantenerse sincronizado.
- Vercel es el entorno de despliegue.
- `vercel.json` contiene configuración con impacto en producción, incluido el cron.
- No deben modificarse variables, dominios, cron jobs ni despliegues de producción como efecto lateral de otra tarea.

`next.config.mjs` permite actualmente que la build termine aunque haya errores TypeScript. Por ello, la validación mínima separa:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Principios de evolución

- Mantener el código exclusivo de servidor fuera del bundle del navegador.
- Preferir el patrón existente de carga en servidor cuando ya se utilice.
- No cambiar contratos entre componentes, APIs y consumidores sin revisar la cadena completa.
- Tratar OpenAI, SMTP y el cron como integraciones con coste o efectos secundarios.
- Documentar aquí los cambios estables de arquitectura; registrar en `MEMORY.md` sólo el estado o los pendientes vivos.
