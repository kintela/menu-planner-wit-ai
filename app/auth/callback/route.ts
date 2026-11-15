import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { classifyCallbackFailure } from "@/lib/auth-flow/auth-flow"

// Callback de autenticación (Spec 001 RF-6, RF-10, RF-11).
// - Las cookies de sesión se escriben en la MISMA respuesta de redirección que
//   se devuelve, para que la sesión de recuperación llegue al navegador.
// - /login solo recibe un código de error; el texto mostrado es fijo en la app.
// - Nunca se registran la URL, tokens, email ni metadatos del usuario.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const next = searchParams.get("next") ?? "/"

  const failureRedirect = (failureCode: string | null) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(classifyCallbackFailure({ type, errorCode: failureCode }))}`,
    )

  // Error devuelto por el proveedor en los parámetros (p. ej. OTP expirado).
  if (error) {
    return failureRedirect(errorCode)
  }

  // Para recovery, podemos usar tanto code como token_hash
  const authCode = code || tokenHash

  if (!authCode) {
    return failureRedirect(null)
  }

  const destination = type === "recovery" ? `${origin}/auth/reset-password` : `${origin}${next}`
  const response = NextResponse.redirect(destination)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  try {
    const authResult =
      type === "recovery" && tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        : await supabase.auth.exchangeCodeForSession(authCode)

    if (authResult.error) {
      console.error("[auth/callback] Auth provider error:", authResult.error.code ?? authResult.error.status)
      return failureRedirect(authResult.error.code ?? null)
    }

    return response
  } catch {
    console.error("[auth/callback] Unexpected callback error")
    return failureRedirect(null)
  }
}
