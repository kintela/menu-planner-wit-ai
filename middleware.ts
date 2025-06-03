import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // TEMPORAL: Log detallado para debug
  console.log("🔍 DEBUG - Middleware ejecutándose:", {
    pathname,
    host: request.headers.get("host"),
    userAgent: request.headers.get("user-agent")?.substring(0, 50),
  })

  // Rutas que NO requieren autenticación (lista blanca)
  const publicPaths = [
    "/",
    "/login",
    "/auth/callback",
    "/debug-auth",
    "/api/debug-deployment",
    "/recipes",
    "/history",
    "/categories",
    "/weekly-menu",
    "/recipes/add",
    "/recipes/new",
  ]

  // Permitir rutas de archivos estáticos y API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes("favicon.ico") ||
    pathname.includes(".js") ||
    pathname.includes(".css") ||
    pathname.includes(".json")
  ) {
    return NextResponse.next()
  }

  // Permitir ver recetas individuales (público)
  if (pathname.match(/^\/recipes\/\d+$/)) {
    return NextResponse.next()
  }

  // Permitir editar recetas SIN AUTENTICACIÓN
  if (pathname.match(/^\/recipes\/\d+\/edit$/)) {
    return NextResponse.next()
  }

  // Si es una ruta pública, permitir acceso
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  try {
    // Para todas las demás rutas, verificar autenticación
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            // Solo establecemos cookies en la respuesta
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            response.cookies.delete({
              name,
              ...options,
            })
          },
        },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Si no hay usuario autenticado, redirigir a login
    if (!session) {
      console.log("🚫 Acceso denegado - Redirigiendo a login desde:", pathname)
      const redirectUrl = new URL("/login", request.url)
      redirectUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(redirectUrl)
    }

    console.log("✅ Usuario autenticado - Acceso permitido")
    return response
  } catch (error) {
    console.error("❌ Error en middleware:", error)
    // En caso de error, permitir acceso para evitar bloqueos
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
