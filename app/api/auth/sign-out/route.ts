import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// RF-5: revoca la sesión actual en Supabase (solo este navegador) y elimina
// sus cookies. Usa el cliente @supabase/ssr basado en cookies del proyecto.
export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    const { error } = await supabase.auth.signOut({ scope: "local" })

    if (error) {
      console.error("[api/auth/sign-out] Supabase sign-out failed:", error.code ?? error.status)
      return NextResponse.json({ error: "Unable to sign out" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    console.error("[api/auth/sign-out] Unexpected sign-out error")
    return NextResponse.json({ error: "Unable to sign out" }, { status: 500 })
  }
}
