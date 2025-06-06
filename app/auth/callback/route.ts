import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/"

  console.log("Auth callback params:", {
    code: code ? "present" : "missing",
    tokenHash: tokenHash ? "present" : "missing",
    type,
    error,
    errorCode,
    url: request.url,
  })

  // Si hay un error específico de OTP expirado para recovery
  if (error === "access_denied" && errorCode === "otp_expired" && type === "recovery") {
    console.log("OTP expired for password recovery")
    return NextResponse.redirect(
      `${origin}/login?error=recovery_expired&message=El enlace de recuperación ha expirado. Solicita uno nuevo.`,
    )
  }

  // Si hay un error en los parámetros, redirigir con el error
  if (error) {
    const errorParams = new URLSearchParams()
    errorParams.set("error", error)
    if (errorCode) errorParams.set("error_code", errorCode)
    if (errorDescription) errorParams.set("error_description", errorDescription)

    return NextResponse.redirect(`${origin}/login?${errorParams.toString()}`)
  }

  // Para recovery, podemos usar tanto code como token_hash
  const authCode = code || tokenHash

  if (authCode) {
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
      let authResult

      if (type === "recovery" && tokenHash) {
        // Para recovery con token_hash, usar verifyOtp
        authResult = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        })
      } else {
        // Para otros casos, usar exchangeCodeForSession
        authResult = await supabase.auth.exchangeCodeForSession(authCode)
      }

      console.log("User data from auth:", {
        userId: authResult?.data?.user?.id,
        email: authResult?.data?.user?.email,
        emailVerified: authResult?.data?.user?.email_confirmed_at,
        userMetadata: authResult?.data?.user?.user_metadata,
      })

      if (authResult.error) {
        console.error("Error in auth process:", authResult.error)

        // Si es un error de recovery, redirigir con mensaje específico
        if (type === "recovery") {
          return NextResponse.redirect(
            `${origin}/login?error=recovery_error&message=${encodeURIComponent("Error en la recuperación de contraseña. Solicita un nuevo enlace.")}`,
          )
        }

        return NextResponse.redirect(
          `${origin}/login?error=auth_error&error_description=${encodeURIComponent(authResult.error.message)}`,
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
        `${origin}/login?error=unexpected_error&error_description=${encodeURIComponent(error.message)}`,
      )
    }
  }

  // Si no hay código ni token_hash, redirigir al login con error
  console.log("No code or token_hash found in callback")
  return NextResponse.redirect(`${origin}/login?error=missing_code&message=No se encontró el código de autenticación`)
}
