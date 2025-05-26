import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Rutas que requieren autenticación
  const protectedRoutes = ["/recipes", "/weekly-menu", "/categories", "/history", "/admin", "/profile"]
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute) {
    try {
      const supabase = createServerClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Si no hay usuario, redirigir al login
      if (!user) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
    } catch (error) {
      console.error("Middleware error:", error)
      // En caso de error de conexión, redirigir al login
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
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
        // Si hay un parámetro redirect, ir ahí, sino al inicio
        const redirectTo = request.nextUrl.searchParams.get("redirect") || "/"
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    } catch (error) {
      console.error("Middleware error:", error)
      // En caso de error, permitir continuar al login
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
