import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Por ahora, solo proteger rutas específicas de admin
  const adminRoutes = ["/admin"]
  const isAdminRoute = adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Solo verificar autenticación para rutas de admin por ahora
  if (isAdminRoute) {
    try {
      const supabase = createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
      }
    } catch (error) {
      console.error("Middleware error:", error)
      // En caso de error, permitir continuar para no romper la app
    }
  }

  // Si está en login y ya está autenticado, redirigir al dashboard
  if (request.nextUrl.pathname === "/login") {
    try {
      const supabase = createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        return NextResponse.redirect(new URL("/", request.url))
      }
    } catch (error) {
      console.error("Middleware error:", error)
      // En caso de error, permitir continuar
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}
