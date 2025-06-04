import RecipeClientPage from "./RecipeClientPage"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean | null
  video_url: string | null
  source_url: string | null
  calories: number | null
  created_at: string
  user_id: string | null
}

async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    console.log("🔍 DEBUG - getRecipe iniciado para ID:", id)

    const { createServerClient } = await import("@/lib/supabase/server")
    const supabase = createServerClient()

    // Consulta muy simple sin transformaciones complejas
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error || !recipe) {
      console.error("❌ Error o receta no encontrada:", error?.message || "Sin datos")
      return null
    }

    console.log("✅ Receta encontrada:", recipe.name)
    return recipe
  } catch (error) {
    console.error("❌ Error crítico:", error)
    return null
  }
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  // Validación básica del ID en el servidor
  const numericId = Number.parseInt(params.id, 10)
  if (isNaN(numericId) || numericId <= 0) {
    return <RecipeClientPage params={params} recipe={null} error="invalid_id" />
  }

  // Obtener la receta en el servidor
  const recipe = await getRecipe(params.id)

  return <RecipeClientPage params={params} recipe={recipe} error={null} />
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const recipe = await getRecipe(params.id)
    return {
      title: recipe?.name || "Receta",
      description: `Receta: ${recipe?.name || "Ver detalles de la receta"}`,
    }
  } catch (error) {
    return {
      title: "Receta",
      description: "Ver detalles de la receta",
    }
  }
}
