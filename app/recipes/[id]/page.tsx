import RecipeClientPage from "./RecipeClientPage"
import { cookies } from 'next/headers'; // Importar cookies para inicializar cookieStore

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

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  alias: string | null
  avatar_url: string | null
}

async function getRecipeWithUser(id: string): Promise<{ recipe: Recipe | null; user: UserProfile | null }> {
  try {
    console.log("🔍 DEBUG - getRecipeWithUser iniciado para ID:", id)

    const { createClient } = await import("@/lib/supabase/server")
    const cookieStore = cookies(); // Inicializar cookieStore
    const supabase = createClient(cookieStore);

    // Obtener la receta
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (recipeError || !recipe) {
      console.error("❌ Error o receta no encontrada:", recipeError?.message || "Sin datos", "ID:", id)
      return { recipe: null, user: null }
    }

    console.log("✅ Receta encontrada:", recipe)

    // Obtener información del usuario si existe
    let user: UserProfile | null = null
    if (recipe.user_id) {
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, email, full_name, alias, avatar_url")
        .eq("id", recipe.user_id)
        .single()

      if (!userError && userData) {
        user = userData
        console.log("✅ Usuario encontrado:", userData)
      } else {
        console.log("⚠️ Usuario no encontrado para user_id:", recipe.user_id, "Error:", userError?.message)
      }
    }

    return { recipe, user }
  } catch (error) {
    console.error("❌ Error crítico en getRecipeWithUser:", error, "ID:", id)
    return { recipe: null, user: null }
  }
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  console.log("🔍 DEBUG - RecipePage iniciado con ID:", params.id)

  // Validación básica del ID en el servidor
  const numericId = Number.parseInt(params.id, 10)
  if (isNaN(numericId) || numericId <= 0) {
    console.log("❌ ID inválido:", params.id)
    return <RecipeClientPage params={params} recipe={null} user={null} error="invalid_id" />
  }

  // Obtener la receta y usuario en el servidor
  const { recipe, user } = await getRecipeWithUser(params.id)

  if (!recipe) {
    console.log("❌ Receta no encontrada para ID:", params.id)
    return <RecipeClientPage params={params} recipe={null} user={null} error="not_found" />
  }

  console.log(
    "✅ Pasando datos al cliente - Receta:",
    recipe,
    "Usuario:",
    user || "Sin usuario"
  )

  return <RecipeClientPage params={params} recipe={recipe} user={user} error={null} />
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const { recipe } = await getRecipeWithUser(params.id)
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
