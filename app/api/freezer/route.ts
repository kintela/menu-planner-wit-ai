import { NextResponse } from "next/server"
import {
  createFreezerAdminClient,
  ensureFreezerOwnerMembership,
  getAccessibleFreezerForUser,
  resolveAuthenticatedFreezerUserId,
} from "@/lib/freezer-access"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const resolvedUserId = await resolveAuthenticatedFreezerUserId(request)

    if (!resolvedUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const supabaseAdmin = createFreezerAdminClient()
    let accessibleFreezer = await getAccessibleFreezerForUser(supabaseAdmin, resolvedUserId)

    if (!accessibleFreezer) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("congeladores")
        .insert({ usuario_id: resolvedUserId })
        .select("id, usuario_id, nombre, descripcion")
        .single()

      if (createError) {
        console.error("[api/freezer] Error creating freezer:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      await ensureFreezerOwnerMembership(supabaseAdmin, created.id, resolvedUserId)
      accessibleFreezer = {
        freezer: { ...created, cajones_congelador: [] },
        accessRole: "owner",
      }
    }

    return NextResponse.json({
      freezer: accessibleFreezer.freezer,
      accessRole: accessibleFreezer.accessRole,
      isOwner: accessibleFreezer.accessRole === "owner",
    })
  } catch (error) {
    console.error("[api/freezer] Unexpected error:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Unexpected error" }, { status: 500 })
  }
}
