import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { checkRecipeMenuUsage } from "@/lib/recipes/recipe-server-operations"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient(await cookies())
  const result = await checkRecipeMenuUsage(supabase, id)
  return NextResponse.json(result.body, { status: result.status })
}
