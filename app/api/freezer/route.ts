import { NextResponse } from "next/server"

import {
  FREEZER_ACCESS_ERRORS,
  createFreezerAdminClient,
  createFreezerSessionClient,
  handleFreezerGet,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

// GET /api/freezer (RF-1–RF-4, RF-24, RF-27): la identidad procede
// exclusivamente de la sesión de cookies del route handler y se exige perfil
// vigente antes de cualquier acceso a datos. La lógica autoritativa (resolución
// del singleton existente con fallback del propietario histórico, sin
// auto-creación) vive en la capa de acceso; aquí solo se adaptan los clientes
// de servidor y la respuesta NextResponse.
export async function GET() {
  try {
    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerGet({ sessionClient, adminClient })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}
