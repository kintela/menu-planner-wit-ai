import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

    const supabase = createClient()

    // Update the recipe directly without additional checks for speed
    const updateData = {
      name: body.name,
      ingredients: body.ingredients,
      preparation: body.preparation,
      image_url: body.image_url || null,
      calories: body.calories || null,
      source_url: body.source_url || null,
      video_url: body.video_url || null,
      updated_at: new Date().toISOString(),
    }

    console.log("Updating recipe with data:", updateData)

    const { data: updatedRecipe, error: updateError } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", userId) // Ensure user owns the recipe
      .select()
      .single()

    if (updateError) {
      console.error("Error updating recipe:", updateError)
      return NextResponse.json({ error: "Error al actualizar la receta: " + updateError.message }, { status: 500 })
    }

    if (!updatedRecipe) {
      return NextResponse.json({ error: "Receta no encontrada o no tienes permisos para editarla" }, { status: 404 })
    }

    // Handle categories separately and quickly
    if (body.categories && Array.isArray(body.categories)) {
      console.log("Updating categories:", body.categories)

      // Delete existing categories
      await supabase.from("recipe_categories").delete().eq("recipe_id", params.id)

      // Insert new categories if any
      if (body.categories.length > 0) {
        const categoryInserts = body.categories.map((categoryId: number) => ({
          recipe_id: Number.parseInt(params.id),
          category_id: categoryId,
        }))

        await supabase.from("recipe_categories").insert(categoryInserts)
      }
    }

    console.log("Recipe updated successfully:", updatedRecipe)
    return NextResponse.json({ success: true, recipe: updatedRecipe })
  } catch (error) {
    console.error("Error in PUT /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + (error as Error).message }, { status: 500 })
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
    const supabase = createClient()

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
