import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener la receta
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    if (recipeError) {
      return NextResponse.json(
        {
          error: "Recipe not found",
          details: recipeError,
        },
        { status: 404 },
      )
    }

    // Obtener información del creador
    const { data: creator, error: creatorError } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, alias")
      .eq("id", recipe.created_by)
      .single()

    return NextResponse.json({
      recipe,
      creator: creatorError ? null : creator,
      debug: {
        recipeId: params.id,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error("Debug recipe error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
