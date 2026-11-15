import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listWeeklyMenuAdminTargets } from "@/lib/weekly-menu/weekly-menu-server-operations"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  if ([...request.nextUrl.searchParams.keys()].length > 0) {
    return NextResponse.json({ error: "Parámetros de consulta inválidos" }, { status: 400 })
  }
  const supabase = createClient(await cookies())
  const result = await listWeeklyMenuAdminTargets(supabase)
  return NextResponse.json(result.body, { status: result.status })
}
