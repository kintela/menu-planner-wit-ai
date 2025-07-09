import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request received for recipe:", params.id)

    const userId = request.headers.get("x-user-id")
    console.log("User ID from header:", userId)

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    console.log("Request body received")

    if (!body) {
      console.log("No request body provided")
      return NextResponse.json({ error: "No data provided" }, { status: 400 })
    }

    // Use environment variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration")
      return NextResponse.json({ error: "Configuración de base de datos faltante" }, { status: 500 })
    }

    console.log("Supabase config found, creating client...")

    // Create client with service role key for server operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log("Supabase client created successfully")

    const { name, ingredients, preparation, image_url, calories, source_url, video_url, categories } = body

    const updateData = {
      name,
      ingredients,
      preparation,
      image_url: image_url || null,
      calories: calories ? Number.parseInt(calories) : null,
      source_url: source_url || null,
      video_url: video_url || null,
      updated_at: new Date().toISOString(),
    }

    console.log("About to update recipe in database...")
    console.log("Update data:", updateData)

    // Try the update with explicit timeout
    const updatePromise = supabase.from("recipes").update(updateData).eq("id", params.id).eq("user_id", userId).select()

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database operation timeout")), 15000)
    })

    const result = await Promise.race([updatePromise, timeoutPromise])
    const { data: updatedRecipe, error: updateError } = result as any

    console.log("Update query completed")

    if (updateError) {
      console.error("Supabase update error:", updateError)
      return NextResponse.json(
        {
          error: "Error al actualizar la receta: " + updateError.message,
          details: updateError,
        },
        { status: 500 },
      )
    }

    if (!updatedRecipe || updatedRecipe.length === 0) {
      console.error("No recipe returned after update - possibly no permission or recipe not found")
      return NextResponse.json(
        {
          error: "Receta no encontrada o no tienes permisos para editarla",
        },
        { status: 404 },
      )
    }

    console.log("Recipe updated successfully:", updatedRecipe[0])

    // Handle categories separately and don't let it fail the main update
    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log("Processing categories:", categories)

      try {
        // Delete existing categories
        const deletePromise = supabase.from("recipe_categories").delete().eq("recipe_id", params.id)
        const deleteTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Category delete timeout")), 5000)
        })

        await Promise.race([deletePromise, deleteTimeoutPromise])
        console.log("Existing categories deleted")

        // Insert new categories if any
        const categoryInserts = categories.map((categoryId: number) => ({
          recipe_id: Number.parseInt(params.id),
          category_id: categoryId,
        }))

        const insertPromise = supabase.from("recipe_categories").insert(categoryInserts)
        const insertTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Category insert timeout")), 5000)
        })

        await Promise.race([insertPromise, insertTimeoutPromise])
        console.log("New categories inserted")
      } catch (categoryError) {
        console.error("Error handling categories (non-fatal):", categoryError)
        // Don't fail the whole request for category errors
      }
    }

    console.log("Returning success response")
    return NextResponse.json({
      success: true,
      recipe: updatedRecipe[0],
      message: "Receta actualizada correctamente",
    })
  } catch (error) {
    console.error("Unexpected error in PUT /api/recipes/[id]:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor: " + (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

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
