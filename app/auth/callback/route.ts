import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  console.log("Auth callback - type:", type, "code:", code ? "present" : "missing")

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            let response: NextResponse

            // Si es una recuperación de contraseña, redirigir a la página de reset
            if (type === "recovery") {
              response = NextResponse.redirect(`${origin}/auth/reset-password`)
            } else {
              response = NextResponse.redirect(`${origin}${next}`)
            }

            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
            return response
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si es una recuperación de contraseña, redirigir a la página de reset
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // Si es un login normal, redirigir a la página solicitada
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si hay error, redirigir al login con mensaje de error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
