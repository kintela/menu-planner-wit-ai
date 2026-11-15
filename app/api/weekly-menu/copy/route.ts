import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { copyWeeklyMenu } from "@/lib/weekly-menu/weekly-menu-server-operations"

export const runtime = "nodejs"
const MAX_BODY_BYTES = 4_096

export async function POST(request: NextRequest) {
  if ([...request.nextUrl.searchParams.keys()].length > 0) {
    return NextResponse.json({ error: "Parámetros de consulta inválidos" }, { status: 400 })
  }
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
  const result = await copyWeeklyMenu(supabase, body, new Date())
  return NextResponse.json(result.body, { status: result.status })
}
