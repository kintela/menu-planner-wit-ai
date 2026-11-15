import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createCategory, readPublicCategories } from "@/lib/recipes/recipe-server-operations"

export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createClient(await cookies())
  const result = await readPublicCategories(supabase)
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const supabase = createClient(await cookies())
  const result = await createCategory(supabase, body)
  return NextResponse.json(result.body, { status: result.status })
}
