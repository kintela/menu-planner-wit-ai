import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(`
      *,
      categories (
        id,
        name
      ),
      user_profiles (
        id,
        full_name,
        email,
        alias,
        first_name,
        last_name,
        avatar_url
      )
    `)
    .eq("id", params.id)
    .single()

  if (error) {
    console.error("Error fetching recipe:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(recipe)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: session } = await supabase.auth.getSession()

    if (!session?.session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    if (recipeError) {
      console.error("Error fetching recipe:", recipeError)
      return NextResponse.json({ error: recipeError.message }, { status: 500 })
    }

    if (recipe.user_id !== session.session.user.id) {
      return NextResponse.json({ error: "You don't have permission to update this recipe" }, { status: 403 })
    }

    const updateData = await request.json()
    console.log("Update data:", updateData)

    const { data: updateResult, error: updateError } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", params.id)
      .select()

    if (updateError) {
      console.error("Error updating recipe:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updateResult[0])
  } catch (error: any) {
    console.error("Error in PUT handler:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: session } = await supabase.auth.getSession()
    const url = new URL(request.url)
    const force = url.searchParams.get("force") === "true"

    if (!session?.session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Verificar que la receta existe y pertenece al usuario
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    if (recipeError) {
      console.error("Error fetching recipe:", recipeError)
      return NextResponse.json({ error: recipeError.message }, { status: 500 })
    }

    if (recipe.user_id !== session.session.user.id) {
      return NextResponse.json({ error: "No tienes permisos para eliminar esta receta" }, { status: 403 })
    }

    // 2. Verificar si la receta está en algún menú (solo si no es forzado)
    if (!force) {
      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("id")
        .eq("recipe_id", params.id)

      if (menuError) {
        console.error("Error checking menu items:", menuError)
        return NextResponse.json({ error: menuError.message }, { status: 500 })
      }

      if (menuItems && menuItems.length > 0) {
        return NextResponse.json(
          {
            error: "RECIPE_IN_MENU",
            message: `Esta receta está incluida en ${menuItems.length} menú(s). ¿Deseas eliminarla de todos los menús?`,
          },
          { status: 409 },
        )
      }
    }

    // 3. Si es forzado o no está en menús, eliminar de los menús si existen
    if (force) {
      const { error: deleteMenuError } = await supabase.from("menu_items").delete().eq("recipe_id", params.id)

      if (deleteMenuError) {
        console.error("Error deleting menu items:", deleteMenuError)
        return NextResponse.json({ error: deleteMenuError.message }, { status: 500 })
      }
    }

    // 4. Eliminar la imagen del storage si existe
    if (recipe.image_url) {
      try {
        // Extraer la ruta del storage de la URL
        const imageUrl = recipe.image_url
        const storagePathMatch = imageUrl.match(/\/storage\/v1\/object\/public\/(.+)/)

        if (storagePathMatch && storagePathMatch[1]) {
          const storagePath = decodeURIComponent(storagePathMatch[1])
          console.log("Deleting image from storage:", storagePath)

          const { error: storageError } = await supabase.storage
            .from(storagePath.split("/")[0])
            .remove([storagePath.split("/").slice(1).join("/")])

          if (storageError) {
            console.error("Error deleting image from storage:", storageError)
            // Continuamos con la eliminación de la receta aunque falle la eliminación de la imagen
          }
        }
      } catch (storageError) {
        console.error("Error processing image deletion:", storageError)
        // Continuamos con la eliminación de la receta aunque falle la eliminación de la imagen
      }
    }

    // 5. Eliminar la receta
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", params.id)

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: force ? "Receta eliminada de todos los menús y de tu recetario" : "Receta eliminada correctamente",
    })
  } catch (error: any) {
    console.error("Error in DELETE handler:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
