import { NextResponse } from "next/server"

import {
  FREEZER_ACCESS_ERRORS,
  createFreezerAdminClient,
  createFreezerSessionClient,
  handleFreezerDrawerItemsDelete,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

// DELETE /api/freezer/drawers/[drawerId]/items (RF-18–RF-19, RF-23–RF-27):
// adaptador fino. La identidad procede exclusivamente de la sesión de cookies
// del route handler, se exige perfil vigente y la autorización (acceso/rol con
// fallback de propietarios antiguos, 404 uniforme, 403 de solo lectura) vive en
// el manejador puro de la capa de acceso. El vaciado es definitivo, persistente
// e inclusivo de reservados, dejando el cajón existente y vacío; el vaciado
// solo existe por cajón. La confirmación previa es presentación (T8): esta ruta no lee
// cuerpo y ejecuta la operación autorizada sin confirmación.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ drawerId: string }> },
) {
  try {
    const { drawerId } = await context.params

    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerDrawerItemsDelete({ sessionClient, adminClient, drawerId })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer/drawers/[drawerId]/items] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}
