import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request received for recipe:", params.id)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration")
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const userId = request.headers.get("x-user-id")

    console.log("User ID from header:", userId)
    console.log("Request body:", body)

    if (!userId) {
      console.log("No user ID provided")
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 })
    }

    // Actualizar la receta directamente sin verificar permisos
    console.log("Updating recipe...")
    const updateData = {
      name: body.name,
      ingredients: body.ingredients,
      preparation: body.preparation,
      image_url: body.image_url,
      calories: body.calories,
      source_url: body.source_url,
      video_url: body.video_url,
      updated_at: new Date().toISOString(),
    }

    console.log("Update data:", updateData)

    const { data: updatedRecipe, error: updateError } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating recipe:", updateError)
      return NextResponse.json({ error: "Error al actualizar la receta: " + updateError.message }, { status: 500 })
    }

    console.log("Recipe updated successfully:", updatedRecipe)

    // Actualizar categorías si están presentes
    if (body.categories && Array.isArray(body.categories)) {
      console.log("Updating categories...")

      try {
        // Eliminar categorías existentes
        await supabase.from("recipe_categories").delete().eq("recipe_id", params.id)

        // Insertar nuevas categorías
        if (body.categories.length > 0) {
          const categoryInserts = body.categories.map((categoryId: number) => ({
            recipe_id: Number.parseInt(params.id),
            category_id: categoryId,
          }))

          const { error: categoryError } = await supabase.from("recipe_categories").insert(categoryInserts)

          if (categoryError) {
            console.error("Error updating categories:", categoryError)
          } else {
            console.log("Categories updated successfully")
          }
        }
      } catch (categoryError) {
        console.error("Error in category update:", categoryError)
      }
    }

    return NextResponse.json({ success: true, recipe: updatedRecipe })
  } catch (error) {
    console.error("Error in PUT /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + (error as Error).message }, { status: 500 })
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

    // Get user_id from authorization header or request body
    const authHeader = request.headers.get("authorization")
    const userIdFromHeader = request.headers.get("x-user-id")

    console.log("Delete request headers:", {
      authorization: authHeader,
      userId: userIdFromHeader,
    })

    // Check if it's a forced deletion
    const url = new URL(request.url)
    const forceDelete = url.searchParams.get("force") === "true"

    // Get the recipe with its complete information
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

    // If no user_id in header, try to get it from request body
    const currentUserId = userIdFromHeader
    if (!currentUserId) {
      // As fallback, allow deletion if no user verification
      // (this can be adjusted according to security requirements)
      console.log("No user ID provided, allowing deletion")
    } else {
      // Verify that user is the owner of the recipe
      if (recipe.user_id !== currentUserId) {
        console.error("User ID mismatch:", { recipeUserId: recipe.user_id, currentUserId })
        return NextResponse.json({ error: "Forbidden: No puedes eliminar recetas de otros usuarios" }, { status: 403 })
      }
    }

    // If not forced deletion, check if recipe is in any menu
    if (!forceDelete) {
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, weekly_menu_id")
        .eq("recipe_id", params.id)

      if (menuError) {
        console.error("Error checking menu items:", menuError)
        // Continue even if there's error checking menus
      }

      // If it's in menus, return information about it
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

    // If forced deletion, delete from menus first
    if (forceDelete) {
      const { error: menuDeleteError } = await supabase.from("menu_items").delete().eq("recipe_id", params.id)

      if (menuDeleteError) {
        console.error("Error deleting from menus:", menuDeleteError)
        return NextResponse.json({ error: "Error al eliminar la receta de los menús" }, { status: 500 })
      }
    }

    // Delete the recipe from database
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 })
    }

    // Delete image from storage if exists
    if (recipe.image_url && recipe.image_url.includes("supabase")) {
      try {
        // Extract file name from URL
        const urlParts = recipe.image_url.split("/")
        const fileName = urlParts[urlParts.length - 1]

        if (fileName) {
          const { error: storageError } = await supabase.storage.from("recipe-images").remove([fileName])

          if (storageError) {
            console.error("Error deleting image from storage:", storageError)
            // Don't fail recipe deletion for this
          } else {
            console.log("Image deleted from storage:", fileName)
          }
        }
      } catch (storageError) {
        console.error("Error processing image deletion:", storageError)
        // Don't fail recipe deletion for this
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
