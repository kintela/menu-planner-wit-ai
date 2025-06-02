import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/"

  console.log("Auth callback - type:", type, "code:", code ? "present" : "missing", "error:", error)

  // Si hay un error en los parámetros, redirigir con el error
  if (error) {
    const errorParams = new URLSearchParams()
    errorParams.set("error", error)
    if (errorCode) errorParams.set("error_code", errorCode)
    if (errorDescription) errorParams.set("error_description", errorDescription)

    return NextResponse.redirect(`${origin}/?${errorParams.toString()}`)
  }

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

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
        // Redirigir con error específico
        return NextResponse.redirect(
          `${origin}/?error=auth_error&error_description=${encodeURIComponent(error.message)}`,
        )
      }

      // Si es una recuperación de contraseña, redirigir a la página de reset
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      // Si es un login normal, redirigir a la página solicitada
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error: any) {
      console.error("Unexpected error in auth callback:", error)
      return NextResponse.redirect(
        `${origin}/?error=unexpected_error&error_description=${encodeURIComponent(error.message)}`,
      )
    }
  }

  // Si no hay código, redirigir al login
  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
