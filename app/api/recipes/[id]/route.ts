import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(
        `
        *,
        user_profiles!recipes_created_by_fkey (
          id,
          email,
          full_name,
          alias,
          avatar_url
        )
      `,
      )
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching recipe:", error)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const updates = await request.json()

    // Remover campos que no deben ser actualizados
    const { id, created_at, created_by, user_profiles, ...updateData } = updates

    // Añadir timestamp de actualización
    updateData.updated_at = new Date().toISOString()

    const { data: recipe, error } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating recipe:", error)
      return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("user_id")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      console.error("Error fetching recipe:", fetchError)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verificar que el usuario es el propietario de la receta
    if (recipe.user_id !== user.id) {
      console.error("User ID mismatch:", { recipeUserId: recipe.user_id, currentUserId: user.id })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
