---
name: auth
description: Úsala antes de tocar autenticación, sesiones, cookies, autorización, roles o permisos, o cualquier archivo bajo lib/supabase, lib/auth*, middleware.ts, app/login, app/auth o components/auth
---
# Autenticación y autorización

`docs/AUTH.md` describe el modelo, los roles y la separación cliente/servidor. Esta skill cubre las reglas que no deben romperse.

## Límites que se preservan

| Archivo | Uso |
|---|---|
| `lib/supabase/client.ts` | Singleton de navegador con `@supabase/ssr` |
| `lib/supabase/server.ts` | Código de servidor (server-only por convención) |
| `lib/auth.ts` | Server-only por convención |
| `lib/auth-client.ts` | El que deben usar los Client Components |
| `lib/auth-flow/auth-flow.js` | Lógica pura de cierre de sesión y clasificación de fallos del callback |

`lib/auth.ts` y `lib/supabase/server.ts` **no** tienen un import `server-only` que fuerce la restricción: no importes lógica server-only desde componentes cliente.

Los helpers de roles y permisos están **duplicados** entre los módulos de autenticación. Si cambias permisos o roles, revisa ambos y mantenlos sincronizados.

## Sesiones por cookies

La autenticación de navegador usa el singleton de `lib/supabase/client.ts` con `@supabase/ssr`. **No lo sustituyas por un cliente basado solo en `localStorage`**: las páginas de servidor dependen de las cookies de sesión y un cliente de `localStorage` ya provocó bucles de redirección.

En servidor sigue el patrón de `app/recipes/page.tsx`: esperar a `cookies()`, obtener el cookie store y pasarlo a `createClient`.

`middleware.ts` refresca cookies de sesión y **no es una barrera de autorización**. Toda operación protegida comprueba permisos en servidor, aunque la interfaz o el middleware oculten el acceso. Ocultar algo en la UI no lo protege.

## Decisiones vigentes (spec 001)

- El cierre de sesión se revoca en servidor **antes** de limpiar la interfaz y navegar a `/login`. Si el servidor no lo confirma, la sesión y el estado se conservan.
- La URL de `/login` nunca transporta el texto a mostrar: solo un código público (`recovery_expired`, `recovery_error`, `auth_error`) que la aplicación traduce a un aviso fijo.
- El callback devuelve la misma respuesta de redirección sobre la que escribe las cookies, para que la sesión llegue al navegador.

## Pruebas locales

Para probar la UI contra Supabase local: `next dev` con las variables de `supabase status` inyectadas en runtime, anulando las remotas. `npm run dev` a secas usa `.env.local` y **apunta a producción**.

Entra siempre por un único host: en `next dev` el `origin` del callback se resuelve a `localhost:3000` aunque entres por `127.0.0.1:3000`, y como para cookies son hosts distintos, la sesión se pierde.

No existe interfaz para solicitar la recuperación de contraseña, y la plantilla de correo por defecto apunta a `/auth/v1/verify`, no a `/auth/callback`.
