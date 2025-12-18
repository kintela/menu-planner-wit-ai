import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Middleware para mantener sincronizadas las cookies de sesión de Supabase
// y permitir que las Server Components detecten la sesión.
export async function middleware(request: NextRequest) {
  // Clonar la respuesta para poder mutar cookies si cambia la sesión
  let response = NextResponse.next({ request: { headers: request.headers } })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    // Forzar una lectura ligera de sesión para que se sincronicen cookies si hay refresh
    await supabase.auth.getSession()
  } catch (e) {
    console.warn('[middleware] Error sincronizando sesión supabase:', e)
  }

  return response
}

// Aplicar a rutas que necesitan sesión (ajusta si quieres excluir assets)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|placeholder|api/debug-env).*)',
  ],
}
