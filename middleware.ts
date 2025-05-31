import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // TEMPORAL: Log detallado para debug
  console.log("🔍 DEBUG - Middleware ejecutándose:", {
    pathname,
    host: request.headers.get("host"),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  })

  // Rutas que NO requieren autenticación (lista blanca)
  const publicPaths = [
    "/",
    "/login",
    "/auth/callback",
    "/debug-auth",
    "/api/debug-deployment", // Añadir ruta de debug
    "/recipes", // Ahora es público - todos pueden ver recetas
    "/history", // Permitir que la página maneje su propia autenticación
    "/categories", // Permitir que la página maneje su propia autenticación
    "/weekly-menu", // Permitir que la página maneje su propia autenticación
    "/recipes/add", // Permitir que la página maneje su propia autenticación
    "/recipes/new", // Permitir que la página maneje su propia autenticación
  ]

  // Permitir rutas de archivos estáticos y API
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes("favicon.ico")) {
    return NextResponse.next()
  }

  // Permitir ver recetas individuales (público)
  if (pathname.match(/^\/recipes\/\d+$/)) {
    console.log("✅ Permitiendo acceso público a receta individual")
    return NextResponse.next()
  }

  // Permitir editar recetas SIN AUTENTICACIÓN
  if (pathname.match(/^\/recipes\/\d+\/edit$/)) {
    console.log("✅ Permitiendo acceso libre a editar receta")
    return NextResponse.next()
  }

  // Si es una ruta pública, permitir acceso
  if (publicPaths.includes(pathname)) {
    console.log("✅ Ruta pública permitida")
    return NextResponse.next()
  }

  // TEMPORAL: Si hay problemas con Supabase, permitir acceso
  try {
    // Para todas las demás rutas, verificar autenticación
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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    console.log("👤 Usuario encontrado:", user ? `${user.email}` : "No autenticado")

    // Si no hay usuario autenticado, redirigir a login
    if (!user) {
      console.log("🚫 Acceso denegado - Redirigiendo a login desde:", pathname)
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    console.log("✅ Usuario autenticado - Acceso permitido")
    return supabaseResponse
  } catch (error) {
    console.error("❌ Error en middleware:", error)
    // En caso de error, permitir acceso para evitar bloqueos
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
