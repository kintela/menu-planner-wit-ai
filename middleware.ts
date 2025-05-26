import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("🔒 Middleware ejecutándose para:", request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Obtener el usuario actual
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  console.log("👤 Usuario encontrado:", user ? `${user.email} (${user.id})` : "No autenticado")
  console.log("❌ Error de auth:", error?.message || "Ninguno")

  // Rutas que requieren autenticación
  const protectedRoutes = [
    "/categories", // Ahora requiere autenticación
    "/recipes/add",
    "/recipes/new",
    "/recipes/[id]/edit",
    "/weekly-menu",
    "/profile",
    "/admin",
    "/history",
  ]

  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes("[id]")) {
      // Para rutas dinámicas como /recipes/[id]/edit
      const pattern = route.replace("[id]", "\\d+")
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(request.nextUrl.pathname)
    }
    return request.nextUrl.pathname.startsWith(route)
  })

  console.log("🛡️ Ruta protegida:", isProtectedRoute)

  // Si es una ruta protegida y no hay usuario autenticado
  if (isProtectedRoute && !user) {
    console.log("🚫 Acceso denegado - Redirigiendo a login")
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Permitir acceso a /recipes (solo lectura) sin autenticación
  if (request.nextUrl.pathname === "/recipes" || request.nextUrl.pathname.match(/^\/recipes\/\d+$/)) {
    console.log("✅ Acceso permitido a vista de recetas")
    return supabaseResponse
  }

  console.log("✅ Acceso permitido")
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /login (login page)
     * - /auth/* (authentication pages)
     * - api routes
     * - root path (/)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|auth|api|^/$).*)",
  ],
}
