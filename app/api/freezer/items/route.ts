import { NextResponse } from "next/server"
import {
  FREEZER_ITEM_SELECT_FIELDS,
  createFreezerAdminClient,
  resolveAuthenticatedFreezerUserId,
  resolveFreezerAccess,
} from "@/lib/freezer-access"

const ITEM_STATES = ["fresco", "abierto", "bajo", "agotado"] as const

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 })
    }

    const drawerId = typeof body?.cajon_id === "string" ? body.cajon_id.trim() : ""
    const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : ""

    if (!drawerId) {
      return NextResponse.json({ error: "Falta el cajón asociado." }, { status: 400 })
    }

    if (!nombre) {
      return NextResponse.json({ error: "El nombre del elemento es obligatorio." }, { status: 400 })
    }

    if (typeof body?.estado !== "string" || !ITEM_STATES.includes(body.estado)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 })
    }

    const userId = await resolveAuthenticatedFreezerUserId(request)
    if (!userId) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
    }

    const supabase = createFreezerAdminClient()
    const { data: drawer, error: drawerError } = await supabase
      .from("cajones_congelador")
      .select("id, congelador_id")
      .eq("id", drawerId)
      .maybeSingle()

    if (drawerError) {
      console.error("[api/freezer/items] Error fetching drawer", drawerError)
      return NextResponse.json({ error: "No se pudo validar el cajón." }, { status: 500 })
    }

    if (!drawer?.congelador_id) {
      return NextResponse.json({ error: "El cajón indicado no existe." }, { status: 404 })
    }

    const access = await resolveFreezerAccess(supabase, drawer.congelador_id, userId)
    if (!access.hasAccess) {
      return NextResponse.json({ error: "No tienes permisos para añadir elementos en ese congelador." }, { status: 403 })
    }

    if (access.accessRole === "viewer") {
      return NextResponse.json({ error: "Tu acceso a este congelador es de solo lectura." }, { status: 403 })
    }

    const optionalStringFields = [
      "unidad",
      "categoria",
      "notas",
      "fecha_compra",
      "fecha_congelacion",
      "fecha_caducidad",
    ] as const

    const insertPayload: Record<string, any> = {
      cajon_id: drawerId,
      nombre,
      estado: body.estado,
    }

    if ("cantidad" in body) {
      const value = body.cantidad
      if (value === null || typeof value === "number") {
        insertPayload.cantidad = value
      } else {
        return NextResponse.json({ error: "Cantidad inválida." }, { status: 400 })
      }
    }

    for (const field of optionalStringFields) {
      if (field in body) {
        const value = body[field]
        if (value === null) {
          insertPayload[field] = null
        } else if (typeof value === "string") {
          insertPayload[field] = value.trim() || null
        } else {
          return NextResponse.json({ error: `Valor inválido para ${field}.` }, { status: 400 })
        }
      }
    }

    if ("reservado" in body) {
      if (typeof body.reservado === "boolean") {
        insertPayload.reservado = body.reservado
      } else {
        return NextResponse.json({ error: "Valor inválido para reservado." }, { status: 400 })
      }
    }

    const { data: item, error: insertError } = await supabase
      .from("elementos_cajon")
      .insert(insertPayload)
      .select(FREEZER_ITEM_SELECT_FIELDS)
      .maybeSingle()

    if (insertError) {
      console.error("[api/freezer/items] Error inserting item", insertError)
      return NextResponse.json({ error: insertError.message ?? "No se pudo guardar el elemento." }, { status: 500 })
    }

    if (!item) {
      return NextResponse.json({ error: "No se pudo recuperar el elemento creado." }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error("[api/freezer/items] Unexpected error", error)
    return NextResponse.json({ error: (error as Error).message ?? "Unexpected error" }, { status: 500 })
  }
}
