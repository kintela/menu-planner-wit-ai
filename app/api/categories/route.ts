import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient({
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => cookieStore.set(name, value, options),
    })

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, created_at")
      .order("name")

    if (error) {
      console.error("[api/categories] Error obteniendo categorías:", error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ categories: data ?? [] })
  } catch (error) {
    console.error("[api/categories] Error inesperado:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Error interno del servidor" }, { status: 500 })
  }
}
