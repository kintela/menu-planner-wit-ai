import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request received for recipe:", params.id)
    console.log("Creating Supabase client...")
    console.log("Parsing request body...")

    const userId = request.headers.get("x-user-id")
    const body = await request.json()

    console.log("User ID from header:", userId)
    console.log("Request body:", body)

    // Mock response for testing
    console.log("Returning mock success response...")
    return NextResponse.json({
      success: true,
      message: "Recipe updated successfully (mock)",
      data: { id: params.id, ...body },
    })
  } catch (error) {
    console.error("Error in PUT /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
          first_name,
          last_name,
          alias,
          avatar_url
        ),
        recipe_categories (
          categories (
            id,
            name
          )
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching recipe:", error)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error("Error in GET /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
