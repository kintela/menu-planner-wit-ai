import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { mergeCategories } from "@/lib/recipes/recipe-server-operations"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const supabase = createClient(await cookies())
  const result = await mergeCategories(supabase, body)
  return NextResponse.json(result.body, { status: result.status })
}
