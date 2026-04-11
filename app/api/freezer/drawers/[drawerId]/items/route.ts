import { NextResponse } from "next/server"
import {
  createFreezerAdminClient,
  resolveAuthenticatedFreezerUserId,
  resolveFreezerAccess,
} from "@/lib/freezer-access"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ drawerId: string }> },
) {
  const { drawerId } = await context.params

  if (!drawerId) {
    return NextResponse.json({ error: "Falta el identificador del cajón." }, { status: 400 })
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
    console.error("[api/freezer/drawers/[drawerId]/items] Error fetching drawer", drawerError)
    return NextResponse.json({ error: "No se pudo validar el cajón." }, { status: 500 })
  }

  if (!drawer?.congelador_id) {
    return NextResponse.json({ error: "El cajón indicado no existe." }, { status: 404 })
  }

  const access = await resolveFreezerAccess(supabase, drawer.congelador_id, userId)
  if (!access.hasAccess) {
    return NextResponse.json({ error: "No tienes permisos para vaciar ese cajón." }, { status: 403 })
  }

  if (access.accessRole === "viewer") {
    return NextResponse.json({ error: "Tu acceso a este congelador es de solo lectura." }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from("elementos_cajon").delete().eq("cajon_id", drawerId)

  if (deleteError) {
    console.error("[api/freezer/drawers/[drawerId]/items] Error clearing drawer", deleteError)
    return NextResponse.json({ error: deleteError.message ?? "No se pudo vaciar el cajón." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
