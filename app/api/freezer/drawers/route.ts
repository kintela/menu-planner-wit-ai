import { NextResponse } from "next/server"
import {
  createFreezerAdminClient,
  resolveAuthenticatedFreezerUserId,
  resolveFreezerAccess,
} from "@/lib/freezer-access"

export async function POST(request: Request) {
  try {
    const { freezerId, drawers } = await request.json()

    if (!freezerId || !Array.isArray(drawers)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const userId = await resolveAuthenticatedFreezerUserId(request)

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const supabase = createFreezerAdminClient()
    const access = await resolveFreezerAccess(supabase, freezerId, userId)

    if (!access.hasAccess) {
      return NextResponse.json({ error: "No tienes permisos sobre ese congelador." }, { status: 403 })
    }

    if (access.accessRole === "viewer") {
      return NextResponse.json({ error: "Tu acceso a este congelador es de solo lectura." }, { status: 403 })
    }

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
