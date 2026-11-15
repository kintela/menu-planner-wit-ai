import { NextResponse } from "next/server"

import {
  FREEZER_ACCESS_ERRORS,
  createFreezerAdminClient,
  createFreezerSessionClient,
  handleFreezerDrawersPost,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

// POST /api/freezer/drawers (RF-5–RF-8, RF-23–RF-24, RF-27): contrato
// `{ freezerId, totalCajones }` (número objetivo). La identidad procede
// exclusivamente de la sesión de cookies del route handler y se exige perfil
// vigente antes de cualquier acceso a datos. Solo el propietario admin puede
// ampliar el singleton. La lógica (resolución de acceso y rol con fallback,
// validación del objetivo 1–5, rechazo de reducción, no-op cuando el valor
// coincide y cálculo en servidor de nombres y posiciones automáticos) vive en
// la capa de acceso; aquí solo se adaptan los clientes de servidor y la
// respuesta NextResponse.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerDrawersPost({
      sessionClient,
      adminClient,
      freezerId: body?.freezerId,
      totalCajones: body?.totalCajones,
    })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer/drawers] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}
