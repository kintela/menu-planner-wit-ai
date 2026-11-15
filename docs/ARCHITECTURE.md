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

La lectura pública de recetas atraviesa `get_public_recipes` y se normaliza en
`lib/recipes/recipe-server-operations.js`. Su DTO contiene los campos públicos de
receta, categorías, alias seguro y agregados de valoración, pero no identificadores
de autor, perfiles ni filas individuales de valoraciones. Las escrituras de recetas,
categorías, valoraciones e imágenes usan Route Handlers con la sesión de cookies; no
aceptan una identidad del navegador como autorización ni usan service-role.

Las imágenes gestionadas se operan mediante la ruta por receta. El orden estable es
subir, asociar y después limpiar el objeto anterior; una URL externa o un objeto sin
metadata acreditada nunca se elimina automáticamente. El endpoint genérico de carga
y el antiguo endpoint de diagnóstico de Storage permanecen cerrados con `404`.
Las transiciones de asociación, retirada y borrado de receta son RPCs atómicas con
sesión; la metadata y la acreditación de limpieza no tienen acceso directo desde el
cliente. Tras retirar la referencia, la autorización privada permite limpiar el objeto
incluso si la receta ya no existe y se revoca al confirmar que Storage lo eliminó.

El detalle autenticado añade capacidades de edición/borrado sin publicar identidad de
autor. Solo el listado de administrador añade una clave opaca efímera de agrupación y
una etiqueta desambiguada para filtrar autores con el mismo alias.

`app/recipes/page.tsx` carga desde Supabase una relación denominada `menu_items` y la transforma en `menu_ids` antes de entregar los datos a:

```text
components/recipes-page-client.tsx
```

`menu_ids` es el contrato consumido por la capa cliente. Cambiar la consulta o la transformación exige revisar toda la cadena de consumidores.

El borrado de recetas falla si existe cualquier `menu_item`; no existe borrado
forzado ni cascada desde recetas hacia elementos de menú.

El planificador semanal usa una frontera SSR y Route Handlers bajo
`/api/weekly-menu`. El navegador mantiene por separado el snapshot persistido y el
borrador, pero no consulta ni escribe `weekly_menus` o `menu_items` directamente. El
servidor deriva actor y capacidad administrativa de la sesión de cookies y delega el
reemplazo o vaciado completo a RPCs transaccionales sujetas a RLS, sin service-role.
Antes de cualquier operación propia o administrativa, servidor y persistencia exigen un
perfil vigente con uno de los tres roles admitidos por el planificador.
La comprobación parametrizada usada por RLS reside en un esquema privado no expuesto por
PostgREST; la capacidad pública del actor no acepta UUID ni otro argumento del cliente.

`lib/weekly-menu/weekly-menu-domain.js` centraliza las semanas civiles de lunes a
domingo en `Europe/Madrid`, los 21 huecos y la comparación canónica del borrador. La
copia obtiene un snapshot de otra semana y solo modifica el borrador; no escribe el
destino hasta Guardar. Las semanas pasadas son de solo lectura. El guard de cambios
pendientes cubre acciones del planificador, enlaces de ruta, atrás/adelante,
recarga/cierre y cierre de sesión; el aviso de recarga/cierre queda controlado por el
navegador.

La marca «sacado del congelador» es únicamente un booleano de `menu_items`: el flujo
semanal no llama al inventario ni crea fechas, reservas o movimientos.

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
