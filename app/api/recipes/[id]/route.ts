import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

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

    // Try server-side authentication first
    const serverSupabase = createServerClient()
    const {
      data: { user: serverUser },
      error: serverAuthError,
    } = await serverSupabase.auth.getUser()

    let currentUserId = null

    if (serverUser && !serverAuthError) {
      currentUserId = serverUser.id
      console.log("Server-side auth successful:", currentUserId)
    } else {
      // Fallback to header-based user ID
      const userIdFromHeader = request.headers.get("x-user-id")
      if (userIdFromHeader) {
        currentUserId = userIdFromHeader
        console.log("Using header user ID:", currentUserId)
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: "No autorizado - Usuario no identificado" }, { status: 401 })
    }

    // Obtener la receta para verificar permisos
    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("user_id, name")
      .eq("id", params.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Verificar si es el propietario
    const isOwner = recipe.user_id === currentUserId

    // Verificar si es admin
    let isAdmin = false
    try {
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", currentUserId).single()
      isAdmin = profile?.role === "admin"
    } catch (err) {
      console.error("Error checking admin status:", err)
    }

    // Solo el propietario o admin pueden editar
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden - Solo puedes editar tus propias recetas",
        },
        { status: 403 },
      )
    }

    const updates = await request.json()

    // Extraer categorías si están presentes
    const { categories, id, created_at, created_by, user_profiles, user_id, ...updateData } = updates

    console.log("Updating recipe with data:", updateData)

    const { data: updatedRecipe, error } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating recipe:", error)
      return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
    }

    // Actualizar categorías si están presentes
    if (categories && Array.isArray(categories)) {
      try {
        // Eliminar categorías existentes
        await supabase.from("recipe_categories").delete().eq("recipe_id", params.id)

        // Insertar nuevas categorías
        if (categories.length > 0) {
          const categoryRelations = categories.map((categoryId: number) => ({
            recipe_id: params.id,
            category_id: categoryId,
          }))
          await supabase.from("recipe_categories").insert(categoryRelations)
        }
      } catch (categoryError) {
        console.error("Error updating categories:", categoryError)
        // No fallar por esto
      }
    }

    console.log("Recipe updated successfully:", updatedRecipe)
    return NextResponse.json(updatedRecipe)
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

    // Obtener el user_id del header de autorización o del cuerpo de la petición
    const authHeader = request.headers.get("authorization")
    const userIdFromHeader = request.headers.get("x-user-id")

    console.log("Delete request headers:", {
      authorization: authHeader,
      userId: userIdFromHeader,
    })

    // Verificar si es una eliminación forzada
    const url = new URL(request.url)
    const forceDelete = url.searchParams.get("force") === "true"

    // Obtener la receta con su información completa
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

    // Si no hay user_id en el header, intentar obtenerlo del cuerpo de la petición
    const currentUserId = userIdFromHeader
    if (!currentUserId) {
      // Como fallback, permitir la eliminación si no hay verificación de usuario
      // (esto se puede ajustar según los requisitos de seguridad)
      console.log("No user ID provided, allowing deletion")
    } else {
      // Verificar que el usuario es el propietario de la receta
      if (recipe.user_id !== currentUserId) {
        console.error("User ID mismatch:", { recipeUserId: recipe.user_id, currentUserId })
        return NextResponse.json({ error: "Forbidden: No puedes eliminar recetas de otros usuarios" }, { status: 403 })
      }
    }

    // Si no es eliminación forzada, verificar si la receta está en algún menú
    if (!forceDelete) {
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id, weekly_menu_id")
        .eq("recipe_id", params.id)

      if (menuError) {
        console.error("Error checking menu items:", menuError)
        // Continuar aunque haya error en la verificación de menús
      }

      // Si está en menús, devolver información sobre ello
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

    // Si es eliminación forzada, eliminar primero de los menús
    if (forceDelete) {
      const { error: menuDeleteError } = await supabase.from("menu_items").delete().eq("recipe_id", params.id)

      if (menuDeleteError) {
        console.error("Error deleting from menus:", menuDeleteError)
        return NextResponse.json({ error: "Error al eliminar la receta de los menús" }, { status: 500 })
      }
    }

    // Eliminar la receta de la base de datos
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 })
    }

    // Eliminar la imagen del storage si existe
    if (recipe.image_url && recipe.image_url.includes("supabase")) {
      try {
        // Extraer el nombre del archivo de la URL
        const urlParts = recipe.image_url.split("/")
        const fileName = urlParts[urlParts.length - 1]

        if (fileName) {
          const { error: storageError } = await supabase.storage.from("recipe-images").remove([fileName])

          if (storageError) {
            console.error("Error deleting image from storage:", storageError)
            // No fallar la eliminación de la receta por esto
          } else {
            console.log("Image deleted from storage:", fileName)
          }
        }
      } catch (storageError) {
        console.error("Error processing image deletion:", storageError)
        // No fallar la eliminación de la receta por esto
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
