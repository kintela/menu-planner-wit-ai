import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createRecipe, readPublicRecipes } from "@/lib/recipes/recipe-server-operations"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const supabase = createClient(await cookies())
  const result = await createRecipe(supabase, body, new Date())
  return NextResponse.json(result.body, { status: result.status })
}

export async function GET() {
  const supabase = createClient(await cookies())
  const result = await readPublicRecipes(supabase)
  return NextResponse.json(result.body, { status: result.status })
}
