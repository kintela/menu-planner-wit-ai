import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Auth error:", authError)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const recipeId = params.id

    // Primero verificar que la receta existe y pertenece al usuario
    const { data: recipe, error: fetchError } = await supabase
      .from("recipes")
      .select("user_id")
      .eq("id", recipeId)
      .single()

    if (fetchError) {
      console.error("Error fetching recipe:", fetchError)
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 })
    }

    // Verificar que el usuario es el propietario de la receta
    if (recipe.user_id !== user.id) {
      console.error("User ID mismatch:", { recipeUserId: recipe.user_id, currentUserId: user.id })
      return NextResponse.json({ error: "No tienes permisos para eliminar esta receta" }, { status: 403 })
    }

    // Eliminar la receta
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", recipeId).eq("user_id", user.id) // Doble verificación de seguridad

    if (deleteError) {
      console.error("Error deleting recipe:", deleteError)
      return NextResponse.json({ error: "Error al eliminar la receta" }, { status: 500 })
    }

    return NextResponse.json({ message: "Receta eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
