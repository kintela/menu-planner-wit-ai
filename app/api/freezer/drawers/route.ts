import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { freezerId, drawers } = await request.json()

    if (!freezerId || !Array.isArray(drawers)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !url) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const payload = drawers.map((drawer: any, index: number) => ({
      nombre: drawer.nombre ?? `Cajón ${index + 1}`,
      posicion: drawer.posicion ?? index + 1,
      descripcion: drawer.descripcion ?? null,
      congelador_id: freezerId,
    }))

    const { data, error } = await supabase
      .from("cajones_congelador")
      .insert(payload)
      .select("id, nombre, posicion, descripcion, creado_en")

    if (error) {
      console.error("[api/freezer/drawers] Error inserting drawers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ drawers: data })
  } catch (error) {
    console.error("[api/freezer/drawers] Unexpected error:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Unexpected error" }, { status: 500 })
  }
}
