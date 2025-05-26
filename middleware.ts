import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient()

  // Verificar si el usuario está autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas que requieren autenticación
  const protectedRoutes = ["/recipes", "/weekly-menu", "/categories", "/history"]
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  // Si es una ruta protegida y no hay usuario, redirigir al login
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Si está en login y ya está autenticado, redirigir al dashboard
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/", request.url))
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
