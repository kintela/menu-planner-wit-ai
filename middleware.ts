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

  // Rutas públicas (permitidas sin autenticación)
  const publicRoutes = ["/", "/recipes", "/login", "/auth"]

  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/recipes") {
      // Permitir /recipes y /recipes/[id] (solo lectura)
      return request.nextUrl.pathname === "/recipes" || request.nextUrl.pathname.match(/^\/recipes\/\d+$/)
    }
    return request.nextUrl.pathname.startsWith(route)
  })

  console.log("🌍 Ruta pública:", isPublicRoute)

  // Si NO es una ruta pública y no hay usuario autenticado
  if (!isPublicRoute && !user) {
    console.log("🚫 Acceso denegado - Redirigiendo a login")
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
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
     * - api routes
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}
