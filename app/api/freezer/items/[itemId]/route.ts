import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const ITEM_STATES = ["fresco", "abierto", "bajo", "agotado"] as const
const ITEM_SELECT_FIELDS = `
  id,
  cajon_id,
  nombre,
  cantidad,
  unidad,
  estado,
  categoria,
  fecha_compra,
  fecha_congelacion,
  fecha_caducidad,
  notas,
  imagen_url,
  creado_en,
  actualizado_en
`

const normalizeOwnerId = (drawer: any): string | null => {
  if (!drawer) return null
  const ownerData = drawer.congeladores
  if (!ownerData) return null
  if (Array.isArray(ownerData)) {
    return ownerData[0]?.usuario_id ?? null
  }
  return ownerData.usuario_id ?? null
}

export async function PATCH(request: Request, context: { params: { itemId: string } }) {
  const {
    params: { itemId },
  } = context

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

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

  if (!accessToken) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceRoleKey || !url || !anonKey) {
    return NextResponse.json({ error: "Configuración de Supabase incompleta." }, { status: 500 })
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken)

  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: itemRecord, error: itemError } = await supabase
    .from("elementos_cajon")
    .select(
      `
        id,
        cajon_id,
        cajones_congelador (
          id,
          congelador_id,
          congeladores (
            id,
            usuario_id
          )
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

  const ownerId = normalizeOwnerId(itemRecord.cajones_congelador)

  if (ownerId !== userData.user.id) {
    return NextResponse.json({ error: "No tienes permisos para editar este elemento." }, { status: 403 })
  }

  const sanitizedUpdates: Record<string, any> = {}

  if (typeof updates.nombre !== "string" || !updates.nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 })
  }
  sanitizedUpdates.nombre = updates.nombre.trim()

  if (typeof updates.estado !== "string" || !ITEM_STATES.includes(updates.estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 })
  }
  sanitizedUpdates.estado = updates.estado as (typeof ITEM_STATES)[number]

  if ("cantidad" in updates) {
    const value = updates.cantidad
    if (value === null || typeof value === "number") {
      sanitizedUpdates.cantidad = value
    } else {
      return NextResponse.json({ error: "Cantidad inválida." }, { status: 400 })
    }
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

  const { data: updatedItem, error: updateError } = await supabase
    .from("elementos_cajon")
    .update(sanitizedUpdates)
    .eq("id", itemId)
    .eq("cajon_id", drawerId)
    .select(ITEM_SELECT_FIELDS)
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
