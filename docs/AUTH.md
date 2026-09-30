# Autenticación y autorización

## Modelo actual

La aplicación utiliza Supabase Auth con `@supabase/ssr`. La sesión se mantiene mediante cookies para que el navegador, los Server Components y los Route Handlers compartan un flujo compatible con renderizado en servidor.

No debe sustituirse por un cliente basado exclusivamente en `localStorage`: ese enfoque no proporciona la sesión esperada al servidor y anteriormente provocó bucles de redirección.

## Separación entre cliente y servidor

### Navegador

El cliente de Supabase para navegador se encuentra en:

```text
lib/supabase/client.ts
```

Los Client Components deben utilizar módulos preparados para navegador. Para helpers de autenticación y roles, utilizar:

```text
lib/auth-client.ts
```

El cliente sólo puede usar credenciales públicas como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. La interfaz puede ocultar o deshabilitar acciones, pero esos controles no sustituyen la autorización del servidor.

### Servidor

El cliente de servidor se encuentra en:

```text
lib/supabase/server.ts
```

El patrón existente, visible en `app/recipes/page.tsx`, consiste en esperar a `cookies()`, obtener el almacén de cookies y pasarlo a `createClient`.

`lib/auth.ts` y `lib/supabase/server.ts` son exclusivos de servidor por convención, aunque actualmente no incorporan un import de `server-only` que fuerce esa separación. No deben importarse desde Client Components.

## Middleware y comprobaciones reales

`middleware.ts` refresca las cookies de sesión. No constituye por sí solo una barrera completa de autorización.

Toda página, ruta o servicio protegido debe comprobar en servidor:

1. que existe una sesión válida;
2. qué usuario realiza la operación;
3. si el usuario posee el recurso o tiene el rol requerido;
4. si la acción solicitada está permitida;
5. que la entrada no permite ampliar privilegios.

No confiar únicamente en redirecciones, elementos ocultos de la interfaz o datos enviados por el cliente.

## Roles y permisos

### Recetas

- Cada usuario puede crear y gestionar sus propias recetas.
- Un usuario puede valorar recetas de otros usuarios.
- Un usuario no puede valorar sus propias recetas.

La prohibición de autoevaluación debe validarse en una capa de confianza, no sólo en el componente de interfaz.

### Congeladores

Los congeladores utilizan tres roles:

- `owner`.
- `editor`.
- `viewer`.

Las APIs relacionadas usan acceso mediante service-role a través de:

```text
lib/freezer-access.ts
```

El uso de service-role no autentica ni autoriza al usuario automáticamente. `lib/freezer-access.ts` debe mantener sus comprobaciones explícitas de identidad, pertenencia y nivel de acceso.

Existe un mecanismo de compatibilidad para propietarios antiguos cuando `congeladores_usuarios` no está disponible. Debe preservarse hasta que una migración confirmada permita retirarlo.

## Helpers duplicados

Actualmente hay lógica relacionada con roles y permisos en:

```text
lib/auth.ts
lib/auth-client.ts
```

Mientras continúe duplicada, cualquier modificación debe revisar ambos módulos para evitar diferencias entre lo que muestra el cliente y lo que permite el servidor. La autorización del servidor es siempre la decisión definitiva.

## Secretos

Las siguientes variables son exclusivas de servidor:

```text
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
```

Nunca deben aparecer en:

- variables `NEXT_PUBLIC_*`;
- Client Components o JavaScript enviado al navegador;
- respuestas de API;
- logs;
- ejemplos con valores reales;
- archivos versionados.

`SUPABASE_SERVICE_ROLE_KEY` omite las restricciones normales de RLS y requiere especial cuidado. Sólo debe emplearse desde servidor y junto con autorización explícita de la operación solicitada.

## Lista de comprobación para cambios

Antes de modificar autenticación o permisos:

- revisar los flujos de servidor y cliente afectados;
- identificar el límite de confianza;
- comprobar sesión, propiedad y rol en servidor;
- revisar RLS y cualquier uso de service-role;
- comprobar que no se filtran secretos ni datos sensibles;
- probar usuarios sin sesión y con cada rol relevante;
- verificar que los errores no revelan tokens, cookies, SQL o detalles internos.

Todo cambio estable del modelo de autenticación o autorización debe reflejarse aquí; los problemas temporales o decisiones aún abiertas pertenecen a `MEMORY.md`.
