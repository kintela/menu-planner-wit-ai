import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { deleteRecipe, readRecipeDetail, updateRecipe } from "@/lib/recipes/recipe-server-operations"
import { cleanupDeletedRecipeImage } from "@/lib/recipes/recipe-image-server-operations"

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }
  const { id } = await params
  const supabase = createClient(await cookies())
  const result = await updateRecipe(supabase, id, body, new Date())
  return NextResponse.json(result.body, { status: result.status })
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = createClient(await cookies())
  const result = await readRecipeDetail(supabase, id)
  return NextResponse.json(result.body, { status: result.status })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (new URL(request.url).searchParams.has("force")) {
    return NextResponse.json({ error: "El borrado forzado no está permitido" }, { status: 400 })
  }
  const { id } = await params
  const supabase = createClient(await cookies())
  const result = await cleanupDeletedRecipeImage(supabase, await deleteRecipe(supabase, id))
  return NextResponse.json(result.body, { status: result.status })
}
