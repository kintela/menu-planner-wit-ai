import { NextResponse } from "next/server"
import {
  FREEZER_ITEM_SELECT_FIELDS,
  createFreezerAdminClient,
  resolveAuthenticatedFreezerUserId,
  resolveFreezerAccess,
} from "@/lib/freezer-access"

const ITEM_STATES = ["fresco", "abierto", "bajo", "agotado"] as const

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params

  if (!itemId) {
    return NextResponse.json({ error: "Falta el identificador del elemento." }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 })
  }

  const { drawerId, updates } = body ?? {}

  if (!drawerId || typeof drawerId !== "string") {
    return NextResponse.json({ error: "Falta el cajón asociado." }, { status: 400 })
  }

  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Datos de actualización inválidos." }, { status: 400 })
  }

  const userId = await resolveAuthenticatedFreezerUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
  }

  const supabase = createFreezerAdminClient()

  const { data: itemRecord, error: itemError } = await supabase
    .from("elementos_cajon")
    .select(
      `
        id,
        cajon_id,
        cajones_congelador (
          id,
          congelador_id
        )
      `,
    )
    .eq("id", itemId)
    .maybeSingle()

  if (itemError) {
    console.error("[api/freezer/items/[itemId]] Error fetching item", itemError)
    return NextResponse.json({ error: "No se pudo obtener el elemento." }, { status: 500 })
  }

  if (!itemRecord) {
    return NextResponse.json({ error: "Elemento no encontrado." }, { status: 404 })
  }

  if (itemRecord.cajon_id !== drawerId) {
    return NextResponse.json({ error: "El cajón indicado no coincide." }, { status: 400 })
  }

  const currentDrawerRecord = Array.isArray(itemRecord.cajones_congelador)
    ? itemRecord.cajones_congelador[0]
    : itemRecord.cajones_congelador
  const currentFreezerId = currentDrawerRecord?.congelador_id ?? null

  if (!currentFreezerId) {
    return NextResponse.json({ error: "No se pudo resolver el congelador del elemento." }, { status: 400 })
  }

  const access = await resolveFreezerAccess(supabase, currentFreezerId, userId)
  if (!access.hasAccess) {
    return NextResponse.json({ error: "No tienes permisos para editar este elemento." }, { status: 403 })
  }

  if (access.accessRole === "viewer") {
    return NextResponse.json({ error: "Tu acceso a este congelador es de solo lectura." }, { status: 403 })
  }

  const sanitizedUpdates: Record<string, any> = {}

  if ("nombre" in updates) {
    if (typeof updates.nombre !== "string" || !updates.nombre.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
    }
    sanitizedUpdates.nombre = updates.nombre.trim()
  }

  if ("estado" in updates) {
    if (typeof updates.estado !== "string" || !ITEM_STATES.includes(updates.estado)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 })
    }
    sanitizedUpdates.estado = updates.estado as (typeof ITEM_STATES)[number]
  }

  if ("cantidad" in updates) {
    const value = updates.cantidad
    if (value === null || typeof value === "number") {
      sanitizedUpdates.cantidad = value
    } else {
      return NextResponse.json({ error: "Cantidad inválida." }, { status: 400 })
    }
  }

  if ("cajon_id" in updates) {
    const value = updates.cajon_id

    if (typeof value !== "string" || !value.trim()) {
      return NextResponse.json({ error: "Cajón inválido." }, { status: 400 })
    }

    const nextDrawerId = value.trim()

    if (nextDrawerId !== itemRecord.cajon_id) {
      const { data: targetDrawer, error: targetDrawerError } = await supabase
        .from("cajones_congelador")
        .select("id, congelador_id")
        .eq("id", nextDrawerId)
        .maybeSingle()

      if (targetDrawerError) {
        console.error("[api/freezer/items/[itemId]] Error fetching target drawer", targetDrawerError)
        return NextResponse.json({ error: "No se pudo validar el cajón de destino." }, { status: 500 })
      }

      if (!targetDrawer?.congelador_id) {
        return NextResponse.json({ error: "El cajón de destino no existe." }, { status: 404 })
      }

      const targetAccess = await resolveFreezerAccess(supabase, targetDrawer.congelador_id, userId)

      if (!targetAccess.hasAccess) {
        return NextResponse.json({ error: "No tienes permisos para mover este elemento a ese cajón." }, { status: 403 })
      }

      if (targetAccess.accessRole === "viewer") {
        return NextResponse.json({ error: "Tu acceso al cajón de destino es de solo lectura." }, { status: 403 })
      }

      if (targetDrawer.congelador_id !== currentFreezerId) {
        return NextResponse.json({ error: "El cajón de destino no pertenece al mismo congelador." }, { status: 400 })
      }
    }

    sanitizedUpdates.cajon_id = nextDrawerId
  }

  const optionalStringFields = [
    "unidad",
    "categoria",
    "notas",
    "fecha_compra",
    "fecha_congelacion",
    "fecha_caducidad",
  ] as const

  for (const field of optionalStringFields) {
    if (field in updates) {
      const value = updates[field]
      if (value === null) {
        sanitizedUpdates[field] = null
      } else if (typeof value === "string") {
        sanitizedUpdates[field] = value.trim() || null
      } else {
        return NextResponse.json({ error: `Valor inválido para ${field}.` }, { status: 400 })
      }
    }
  }

  if ("reservado" in updates) {
    if (typeof updates.reservado === "boolean") {
      sanitizedUpdates.reservado = updates.reservado
    } else {
      return NextResponse.json({ error: "Valor inválido para reservado." }, { status: 400 })
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json({ error: "No hay cambios válidos para aplicar." }, { status: 400 })
  }

  const { data: updatedItem, error: updateError } = await supabase
    .from("elementos_cajon")
    .update(sanitizedUpdates)
    .eq("id", itemId)
    .eq("cajon_id", drawerId)
    .select(FREEZER_ITEM_SELECT_FIELDS)
    .maybeSingle()

  if (updateError) {
    console.error("[api/freezer/items/[itemId]] Error updating item", updateError)
    return NextResponse.json({ error: updateError.message ?? "No se pudo actualizar el elemento." }, { status: 500 })
  }

  if (!updatedItem) {
    return NextResponse.json({ error: "Elemento no encontrado tras actualizar." }, { status: 404 })
  }

  return NextResponse.json({ item: updatedItem })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await context.params

  if (!itemId) {
    return NextResponse.json({ error: "Falta el identificador del elemento." }, { status: 400 })
  }

  const userId = await resolveAuthenticatedFreezerUserId(request)
  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
  }

  const supabase = createFreezerAdminClient()
  const { data: itemRecord, error: itemError } = await supabase
    .from("elementos_cajon")
    .select(
      `
        id,
        cajon_id,
        cajones_congelador (
          id,
          congelador_id
        )
      `,
    )
    .eq("id", itemId)
    .maybeSingle()

  if (itemError) {
    console.error("[api/freezer/items/[itemId]] Error fetching item for delete", itemError)
    return NextResponse.json({ error: "No se pudo validar el elemento." }, { status: 500 })
  }

  if (!itemRecord) {
    return NextResponse.json({ error: "Elemento no encontrado." }, { status: 404 })
  }

  const currentDrawerRecord = Array.isArray(itemRecord.cajones_congelador)
    ? itemRecord.cajones_congelador[0]
    : itemRecord.cajones_congelador
  const freezerId = currentDrawerRecord?.congelador_id ?? null

  if (!freezerId) {
    return NextResponse.json({ error: "No se pudo resolver el congelador del elemento." }, { status: 400 })
  }

  const access = await resolveFreezerAccess(supabase, freezerId, userId)
  if (!access.hasAccess) {
    return NextResponse.json({ error: "No tienes permisos para eliminar este elemento." }, { status: 403 })
  }

  if (access.accessRole === "viewer") {
    return NextResponse.json({ error: "Tu acceso a este congelador es de solo lectura." }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from("elementos_cajon").delete().eq("id", itemId)

  if (deleteError) {
    console.error("[api/freezer/items/[itemId]] Error deleting item", deleteError)
    return NextResponse.json({ error: deleteError.message ?? "No se pudo eliminar el elemento." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
