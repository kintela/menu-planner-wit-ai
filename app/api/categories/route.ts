import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase no está configurado" }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await adminClient
      .from("categories")
      .select("id, name, description, created_at")
      .order("name")

    if (error) {
      console.error("[api/categories] Error obteniendo categorías:", error)
      return NextResponse.json({ error: "No se pudieron cargar las categorías" }, { status: 500 })
    }

    return NextResponse.json({ categories: data ?? [] })
  } catch (error) {
    console.error("[api/categories] Error inesperado:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
