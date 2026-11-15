import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { deleteCategory, updateCategory } from "@/lib/recipes/recipe-server-operations"

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
  const result = await updateCategory(supabase, id, body)
  return NextResponse.json(result.body, { status: result.status })
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = createClient(await cookies())
  const result = await deleteCategory(supabase, id)
  return NextResponse.json(result.body, { status: result.status })
}
