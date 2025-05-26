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

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/", "/login", "/auth"]
  const isPublicRoute = publicRoutes.some(
    (route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route),
  )

  console.log("🔍 Middleware Debug:")
  console.log("Path:", request.nextUrl.pathname)
  console.log("Is Protected:", isProtectedRoute)
  console.log("Is Public:", isPublicRoute)

  if (isProtectedRoute) {
    try {
      const supabase = createServerClient()

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      console.log("User check result:", { user: !!user, error: !!error })

      // Si no hay usuario o hay error, redirigir al login
      if (error || !user) {
        console.log("❌ No authenticated user, redirecting to login")
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }

      console.log("✅ User authenticated:", user.email)

      // Para rutas de admin, verificar que sea administrador
      if (request.nextUrl.pathname.startsWith("/admin")) {
        const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

        if (!profile || profile.role !== "admin") {
          console.log("❌ User is not admin, redirecting to home")
          return NextResponse.redirect(new URL("/", request.url))
        }

        console.log("✅ Admin access granted")
      }
    } catch (error) {
      console.error("❌ Middleware error:", error)
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
        console.log("✅ User already authenticated, redirecting from login")
        // Si hay un parámetro redirect, ir ahí, sino al inicio
        const redirectTo = request.nextUrl.searchParams.get("redirect") || "/"
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    } catch (error) {
      console.error("Login redirect error:", error)
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
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*|_next).*)",
  ],
}
