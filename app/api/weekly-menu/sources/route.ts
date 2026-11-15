import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listWeeklyMenuSources } from "@/lib/weekly-menu/weekly-menu-server-operations"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams
  if ([...parameters.keys()].some(key => key !== "target") || parameters.getAll("target").length > 1) {
    return NextResponse.json({ error: "Parámetros de consulta inválidos" }, { status: 400 })
  }
  const input: Record<string, unknown> = {}
  if (parameters.has("target")) input.target = parameters.get("target")
  const supabase = createClient(await cookies())
  const result = await listWeeklyMenuSources(supabase, input, new Date())
  return NextResponse.json(result.body, { status: result.status })
}
