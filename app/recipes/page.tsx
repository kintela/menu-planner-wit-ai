"use client"

import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated?: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    full_name?: string
    first_name?: string
  }
  recipe_categories?: Array<{
    categories: {
      id: number
      name: string
    }
  }>
}

interface Category {
  id: number
  name: string
}

async function getRecipesWithRetry(retries = 3): Promise<{ recipes: Recipe[]; categories: Category[] }> {
  const supabase = createClient()

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${retries} - Cargando recetas...`)

      // Cargar recetas sin relaciones problemáticas
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (recipesError) {
        console.error(`❌ Error cargando recetas (intento ${attempt}):`, recipesError)
        if (attempt === retries) throw recipesError
        continue
      }

      // Cargar categorías
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .order("name")

      if (categoriesError) {
        console.error(`❌ Error cargando categorías (intento ${attempt}):`, categoriesError)
        if (attempt === retries) throw categoriesError
        continue
      }

      // Cargar perfiles de usuario
      const userIds = [...new Set(recipesData?.map((r) => r.user_id) || [])]
      const { data: profilesData } = await supabase.from("user_profiles").select("*").in("id", userIds)

      // Cargar categorías de recetas
      const recipeIds = recipesData?.map((r) => r.id) || []
      const { data: recipeCategoriesData } = await supabase
        .from("recipe_categories")
        .select(`
          recipe_id,
          categories (
            id,
            name
          )
        `)
        .in("recipe_id", recipeIds)

      // Combinar datos
      const recipes: Recipe[] =
        recipesData?.map((recipe) => ({
          ...recipe,
          user_profiles: profilesData?.find((p) => p.id === recipe.user_id),
          recipe_categories: recipeCategoriesData?.filter((rc) => rc.recipe_id === recipe.id) || [],
        })) || []

      console.log(`✅ Cargadas ${recipes.length} recetas y ${categoriesData?.length || 0} categorías`)

      return {
        recipes,
        categories: categoriesData || [],
      }
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error)
      if (attempt === retries) {
        throw error
      }
      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return { recipes: [], categories: [] }
}

export default async function RecipesPage() {
  try {
    const { recipes, categories } = await getRecipesWithRetry()

    return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} />
  } catch (error) {
    console.error("Error cargando recetas:", error)

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Error cargando recetas</h1>
          <p className="text-gray-600 mb-4">
            Hubo un problema al cargar las recetas. Por favor, intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    )
  }
}
