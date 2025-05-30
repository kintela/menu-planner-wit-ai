import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log("🔒 Middleware ejecutándose para:", pathname)

  // Rutas que NO requieren autenticación (lista blanca)
  const publicPaths = [
    "/",
    "/login",
    "/auth/callback",
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

  // Permitir editar recetas (para que la página maneje su propia autenticación)
  if (pathname.match(/^\/recipes\/\d+\/edit$/)) {
    console.log("✅ Permitiendo acceso a editar receta")
    return NextResponse.next()
  }

  // Si es una ruta pública, permitir acceso
  if (publicPaths.includes(pathname)) {
    console.log("✅ Ruta pública permitida")
    return NextResponse.next()
  }

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
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
