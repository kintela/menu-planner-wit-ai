import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { emptyWeeklyMenu, readWeeklyMenu, saveWeeklyMenu } from "@/lib/weekly-menu/weekly-menu-server-operations"

export const runtime = "nodejs"
const MAX_BODY_BYTES = 32_768

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams
  const allowed = new Set(["week", "target"])
  if ([...parameters.keys()].some((key) => !allowed.has(key)) ||
      parameters.getAll("week").length !== 1 || parameters.getAll("target").length > 1) {
    return NextResponse.json({ error: "Parámetros de consulta inválidos" }, { status: 400 })
  }
  const input: Record<string, unknown> = { week: parameters.get("week") }
  if (parameters.has("target")) input.target = parameters.get("target")
  const supabase = createClient(await cookies())
  const result = await readWeeklyMenu(supabase, input, new Date())
  return NextResponse.json(result.body, { status: result.status })
}

export async function PUT(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "El cuerpo de la petición es demasiado grande" }, { status: 413 })
  }
  let body: unknown
  try {
    const text = await request.text()
    if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "El cuerpo de la petición es demasiado grande" }, { status: 413 })
    }
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const supabase = createClient(await cookies())
  const result = await saveWeeklyMenu(supabase, body, new Date())
  return NextResponse.json(result.body, { status: result.status })
}

export async function DELETE(request: NextRequest) {
  const parameters = request.nextUrl.searchParams
  const allowed = new Set(["week", "target"])
  if ([...parameters.keys()].some((key) => !allowed.has(key)) ||
      parameters.getAll("week").length !== 1 || parameters.getAll("target").length > 1) {
    return NextResponse.json({ error: "Parámetros de consulta inválidos" }, { status: 400 })
  }
  const input: Record<string, unknown> = { week: parameters.get("week") }
  if (parameters.has("target")) input.target = parameters.get("target")
  const supabase = createClient(await cookies())
  const result = await emptyWeeklyMenu(supabase, input, new Date())
  return NextResponse.json(result.body, { status: result.status })
}
