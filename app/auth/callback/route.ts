import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

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
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
            })
          },
        },
      },
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Crear el perfil del usuario después de confirmar el email
      try {
        const userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Usuario"

        // Solo roberto.quintela@protonmail.com será admin, todos los demás user_restricted
        const userRole = data.user.email === "roberto.quintela@protonmail.com" ? "admin" : "user_restricted"

        // Verificar si el perfil ya existe
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (!existingProfile) {
          // Crear el perfil solo si no existe
          const { error: profileError } = await supabase.from("user_profiles").insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: userName,
            role: userRole,
          })

          if (profileError) {
            console.error("Error creating user profile:", profileError)
          } else {
            console.log(`✅ User profile created successfully for: ${data.user.email} with role: ${userRole}`)
          }
        } else {
          console.log("ℹ️ User profile already exists for:", data.user.email)
        }
      } catch (profileError) {
        console.error("Failed to create user profile:", profileError)
      }

      // Detectar si estamos en preview de Vercel
      const isVercelPreview = origin.includes(".vercel.app")
      const redirectPath = isVercelPreview ? "/" : next

      console.log(`🔄 Redirecting to: ${origin}${redirectPath} (Preview: ${isVercelPreview})`)

      // Redirigir al usuario
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // Si hay error, redirigir a login
  return NextResponse.redirect(`${origin}/login`)
}
