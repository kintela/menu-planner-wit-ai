import { NextResponse } from "next/server"

import {
  FREEZER_ACCESS_ERRORS,
  MENSAJE_PAYLOAD_INVALIDO,
  createFreezerAdminClient,
  createFreezerSessionClient,
  handleFreezerItemDelete,
  handleFreezerItemPatch,
  readFreezerJsonBody,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

// PATCH y DELETE /api/freezer/items/[itemId] (RF-12–RF-17, RF-23–RF-24,
// RF-27): adaptador fino. La identidad procede exclusivamente de la sesión de
// cookies del route handler y se exige perfil vigente. El manejador puro
// responde 404 uniforme para elemento inexistente o ajeno antes de revelar
// contenido, valida solo los campos presentes, resuelve el movimiento entre
// cajones del mismo congelador antes de la única actualización atómica (sin
// cambios parciales), mantiene la reserva como booleano reversible
// informativo y ejecuta el borrado individual definitivo incluidos
// reservados. El cuerpo se lee con límite de tamaño.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params
    const parsed = await readFreezerJsonBody(request)

    if (!parsed.ok) {
      return NextResponse.json({ error: MENSAJE_PAYLOAD_INVALIDO }, { status: 400 })
    }

    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerItemPatch({
      sessionClient,
      adminClient,
      itemId,
      body: parsed.body,
    })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer/items/[itemId]] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    const { itemId } = await context.params
    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerItemDelete({
      sessionClient,
      adminClient,
      itemId,
    })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer/items/[itemId]] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}
