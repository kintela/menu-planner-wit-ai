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

function parseRecipeId(rawId: unknown): number | null {
  const parsed =
    typeof rawId === "string"
      ? Number.parseInt(rawId, 10)
      : typeof rawId === "number"
        ? Math.floor(rawId)
        : NaN

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function getRecipeWithUser(id: string | number | undefined): Promise<{ recipe: Recipe | null; user: UserProfile | null }> {
  try {
    const parsedId = parseRecipeId(id)
    if (!parsedId) {
      console.error("❌ ID inválido recibido en getRecipeWithUser:", id)
      return { recipe: null, user: null }
    }

    console.log("🔍 DEBUG - getRecipeWithUser iniciado para ID:", parsedId)

    const { createClient } = await import("@/lib/supabase/server")
    const cookieStore = await cookies(); // Inicializar cookieStore
    const supabase = createClient(cookieStore);

    // Obtener la receta
    const { data: recipe, error: recipeError } = await supabase.from("recipes").select("*").eq("id", parsedId).single()

    if (recipeError || !recipe) {
      console.error("❌ Error o receta no encontrada:", recipeError?.message || "Sin datos", "ID:", parsedId)
      return { recipe: null, user: null }
    }

    console.log("✅ Receta encontrada:", recipe)

    // Obtener información del usuario si existe
    let user: UserProfile | null = null
    if (recipe.user_id) {
      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
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

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  console.log("🔍 DEBUG - RecipePage iniciado con ID:", id)

  // Validación básica del ID en el servidor
  const numericId = parseRecipeId(id)
  if (!numericId) {
    console.log("❌ ID inválido:", id)
    return <RecipeClientPage params={{ id }} recipe={null} user={null} error="invalid_id" />
  }

  // Obtener la receta y usuario en el servidor
  const { recipe, user } = await getRecipeWithUser(numericId)

  if (!recipe) {
    console.log("❌ Receta no encontrada para ID:", id)
    return <RecipeClientPage params={{ id }} recipe={null} user={null} error="not_found" />
  }

  console.log(
    "✅ Pasando datos al cliente - Receta:",
    recipe,
    "Usuario:",
    user || "Sin usuario"
  )

  return <RecipeClientPage params={{ id }} recipe={recipe} user={user} error={null} />
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const fallbackMetadata = {
    title: "Receta",
    description: "Ver detalles de la receta",
  }

  try {
    const { id } = await params
    const numericId = parseRecipeId(id)
    if (!numericId) return fallbackMetadata

    const { recipe } = await getRecipeWithUser(numericId)
    return {
      title: recipe?.name || "Receta",
      description: `Receta: ${recipe?.name || "Ver detalles de la receta"}`,
    }
  } catch (error) {
    return fallbackMetadata
  }
}
