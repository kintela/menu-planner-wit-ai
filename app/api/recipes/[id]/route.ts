import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request received for recipe:", params.id)

    const body = await request.json()
    const userId = request.headers.get("x-user-id")

    console.log("User ID from header:", userId)
    console.log("Request body:", body)

    if (!userId) {
      console.log("No user ID provided")
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 })
    }

    console.log("Simulating successful update...")

    // Mock response for testing
    const mockUpdatedRecipe = {
      id: params.id,
      name: body.name,
      ingredients: body.ingredients,
      preparation: body.preparation,
      image_url: body.image_url,
      calories: body.calories,
      source_url: body.source_url,
      video_url: body.video_url,
      updated_at: new Date().toISOString(),
    }

    console.log("Returning mock success response")
    return NextResponse.json({ success: true, recipe: mockUpdatedRecipe })
  } catch (error) {
    console.error("Error in PUT /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + (error as Error).message }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
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
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error("Error in GET /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = request.headers.get("authorization")
    const userIdFromHeader = request.headers.get("x-user-id")

    console.log("Delete request headers:", {
      authorization: authHeader,
      userId: userIdFromHeader,
    })

    const url = new URL(request.url)
    const forceDelete = url.searchParams.get("force") === "true"

    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("user_id, image_url, name")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      console.error("Error fetching recipe:", fetchError)
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    console.log("Recipe data:", recipe)

    const currentUserId = userIdFromHeader
    if (!currentUserId) {
      console.log("No user ID provided, allowing deletion")
    } else {
      if (recipe.user_id !== currentUserId) {
        console.error("User ID mismatch:", { recipeUserId: recipe.user_id, currentUserId })
        return NextResponse.json({ error: "Forbidden: No puedes eliminar recetas de otros usuarios" }, { status: 403 })
      }
    }

    if (!forceDelete) {
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, weekly_menu_id")
        .eq("recipe_id", params.id)

      if (menuError) {
        console.error("Error checking menu items:", menuError)
      }

      if (menuItems && menuItems.length > 0) {
        return NextResponse.json(
          {
            error: "RECIPE_IN_MENU",
            message: `La receta "${recipe.name}" está incluida en ${menuItems.length} menú(s). ¿Deseas eliminarla de todos modos?`,
            menuCount: menuItems.length,
          },
          { status: 409 },
        )
      }
    }

    if (forceDelete) {
      const { error: menuDeleteError } = await supabase.from("menu_items").delete().eq("recipe_id", params.id)

      if (menuDeleteError) {
        console.error("Error deleting from menus:", menuDeleteError)
        return NextResponse.json({ error: "Error al eliminar la receta de los menús" }, { status: 500 })
      }
    }

    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 })
    }

    if (recipe.image_url && recipe.image_url.includes("supabase")) {
      try {
        const urlParts = recipe.image_url.split("/")
        const fileName = urlParts[urlParts.length - 1]

        if (fileName) {
          const { error: storageError } = await supabase.storage.from("recipe-images").remove([fileName])

          if (storageError) {
            console.error("Error deleting image from storage:", storageError)
          } else {
            console.log("Image deleted from storage:", fileName)
          }
        }
      } catch (storageError) {
        console.error("Error processing image deletion:", storageError)
      }
    }

    return NextResponse.json({
      success: true,
      message: forceDelete
        ? "Receta eliminada de menús y base de datos correctamente"
        : "Receta eliminada correctamente",
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
