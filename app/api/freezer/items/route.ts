import { NextResponse } from "next/server"

import {
  FREEZER_ACCESS_ERRORS,
  MENSAJE_PAYLOAD_INVALIDO,
  createFreezerAdminClient,
  createFreezerSessionClient,
  handleFreezerItemPost,
  readFreezerJsonBody,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

// POST /api/freezer/items (RF-8–RF-11, RF-23–RF-24, RF-27): adaptador fino.
// La identidad procede exclusivamente de la sesión de cookies del route
// handler, se exige perfil vigente y toda la validación (nombre obligatorio,
// estado de catálogo, cantidad no negativa, campos opcionales tipados con
// allowlist cerrada) vive en el manejador puro de la capa de acceso. El cuerpo
// se lee con límite de tamaño; un cuerpo demasiado grande o no JSON responde
// 400 uniforme sin tocar datos.
export async function POST(request: Request) {
  try {
    const parsed = await readFreezerJsonBody(request)

    if (!parsed.ok) {
      return NextResponse.json({ error: MENSAJE_PAYLOAD_INVALIDO }, { status: 400 })
    }

    const sessionClient = await createFreezerSessionClient()
    const adminClient = createFreezerAdminClient()
    const outcome = await handleFreezerItemPost({
      sessionClient,
      adminClient,
      body: parsed.body,
    })
    return NextResponse.json(outcome.body, { status: outcome.status })
  } catch (error) {
    console.error("[api/freezer/items] Error inesperado:", error)
    return NextResponse.json({ error: FREEZER_ACCESS_ERRORS.internal.message }, { status: 500 })
  }
}
