import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase no está configurado" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, created_at")
      .order("name")

    if (error) {
      console.error("[api/categories] Error obteniendo categorías:", error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    const categories = (data ?? []).map((cat) => ({
      ...cat,
      id: cat.id != null ? String(cat.id) : "",
    }))

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("[api/categories] Error inesperado:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Error interno del servidor" }, { status: 500 })
  }
}
