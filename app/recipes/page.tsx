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
}

interface UserProfile {
  id: string
  full_name?: string
  first_name?: string
}

interface Category {
  id: number
  name: string
}

interface RecipeCategory {
  recipe_id: number
  category_id: number
}

async function getRecipesWithRetry(retries = 3): Promise<{
  recipes: Recipe[]
  categories: Category[]
  profiles: UserProfile[]
  recipeCategories: RecipeCategory[]
}> {
  const supabase = createClient()

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Intento ${attempt}/${retries} - Cargando recetas...`)

      // Cargar recetas
      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (recipesError) throw recipesError

      // Cargar categorías
      const { data: categories, error: categoriesError } = await supabase.from("categories").select("*")

      if (categoriesError) throw categoriesError

      // Cargar perfiles de usuario únicos
      const userIds = [...new Set(recipes?.map((r) => r.user_id) || [])]
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, full_name, first_name")
        .in("id", userIds)

      if (profilesError) throw profilesError

      // Cargar relaciones receta-categoría
      const recipeIds = recipes?.map((r) => r.id) || []
      const { data: recipeCategories, error: recipeCategoriesError } = await supabase
        .from("recipe_categories")
        .select("recipe_id, category_id")
        .in("recipe_id", recipeIds)

      if (recipeCategoriesError) throw recipeCategoriesError

      console.log(
        `Cargadas ${recipes?.length || 0} recetas y ${categories?.length || 0} categorías en intento ${attempt}`,
      )

      return {
        recipes: recipes || [],
        categories: categories || [],
        profiles: profiles || [],
        recipeCategories: recipeCategories || [],
      }
    } catch (error: any) {
      console.error(`❌ Error en intento ${attempt}:`, error.message)

      if (attempt === retries) {
        console.error("❌ Todos los intentos fallaron, devolviendo datos vacíos")
        return {
          recipes: [],
          categories: [],
          profiles: [],
          recipeCategories: [],
        }
      }

      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return {
    recipes: [],
    categories: [],
    profiles: [],
    recipeCategories: [],
  }
}

export default async function RecipesPage() {
  try {
    const { recipes, categories, profiles, recipeCategories } = await getRecipesWithRetry()

    // Combinar datos para crear recetas enriquecidas
    const enrichedRecipes = recipes.map((recipe) => {
      const profile = profiles.find((p) => p.id === recipe.user_id)
      const recipeCats = recipeCategories
        .filter((rc) => rc.recipe_id === recipe.id)
        .map((rc) => {
          const category = categories.find((c) => c.id === rc.category_id)
          return category ? { categories: category } : null
        })
        .filter(Boolean)

      return {
        ...recipe,
        user_profiles: profile,
        recipe_categories: recipeCats,
      }
    })

    return <RecipesPageClient initialRecipes={enrichedRecipes} initialCategories={categories} />
  } catch (error: any) {
    console.error("Error cargando recetas:", error.message)
    return <RecipesPageClient initialRecipes={[]} initialCategories={[]} />
  }
}
