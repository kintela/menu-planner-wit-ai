import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log("🔍 DEBUG API - Iniciando diagnóstico para receta ID:", id)

    const supabase = createServerClient()
    console.log("✅ Cliente Supabase creado")

    // Consulta directa sin transformaciones
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error) {
      console.error("❌ Error al obtener receta:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        id: id,
      })
    }

    if (!recipe) {
      console.log("⚠️ No se encontró la receta con ID:", id)
      return NextResponse.json({
        success: false,
        error: "Receta no encontrada",
        id: id,
      })
    }

    console.log("✅ Receta encontrada:", recipe.name)

    // Analizar estructura de datos
    const dataAnalysis = {
      id: recipe.id,
      name: recipe.name,
      ingredientsType: typeof recipe.ingredients,
      ingredientsIsArray: Array.isArray(recipe.ingredients),
      ingredientsLength: typeof recipe.ingredients === "string" ? recipe.ingredients.length : "N/A",
      preparationType: typeof recipe.preparation,
      preparationIsArray: Array.isArray(recipe.preparation),
      preparationLength: typeof recipe.preparation === "string" ? recipe.preparation.length : "N/A",
      allKeys: Object.keys(recipe),
    }

    return NextResponse.json({
      success: true,
      recipe: recipe,
      analysis: dataAnalysis,
    })
  } catch (error) {
    console.error("❌ Error crítico en debug-recipe:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    })
  }
}
