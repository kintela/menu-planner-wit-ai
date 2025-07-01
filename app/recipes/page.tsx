import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { rateLimiter } from "@/lib/supabase/rate-limiter"
import RecipesPageClient from "@/components/recipes-page-client"
import Link from "next/link"
import { Plus } from "lucide-react"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    full_name: string
    first_name: string
    last_name: string
    alias: string
    avatar_url: string
    email: string
  }
  categories?: {
    id: number
    name: string
  }[]
}

interface Category {
  id: number
  name: string
}

async function getRecipesWithRetry(retries = 3): Promise<{ recipes: Recipe[]; categories: Category[] }> {
  const cacheKey = "recipes-page"

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${retries} - Cargando recetas reales...`)

      if (!(await rateLimiter.checkLimit(cacheKey))) {
        console.log("⏳ Rate limit alcanzado, esperando...")
        await rateLimiter.waitForSlot(cacheKey)
      }

      const supabase = createClient()

      // Cargar recetas sin la relación problemática
      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      // Cargar categorías
      const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

      if (recipesError) {
        console.error("Error cargando recetas:", recipesError)
        throw recipesError
      }

      if (categoriesError) {
        console.error("Error cargando categorías:", categoriesError)
        throw categoriesError
      }

      // Cargar perfiles de usuario por separado si hay recetas
      let recipesWithProfiles = recipes || []
      if (recipes && recipes.length > 0) {
        const userIds = [...new Set(recipes.map((r) => r.user_id))]

        const { data: profiles } = await supabase.from("user_profiles").select("*").in("id", userIds)

        // Combinar recetas con perfiles
        recipesWithProfiles = recipes.map((recipe) => ({
          ...recipe,
          user_profiles: profiles?.find((p) => p.id === recipe.user_id),
        }))
      }

      // Cargar categorías de recetas por separado
      if (recipes && recipes.length > 0) {
        const recipeIds = recipes.map((r) => r.id)

        const { data: recipeCategories } = await supabase
          .from("recipe_categories")
          .select(`
            recipe_id,
            categories (
              id,
              name
            )
          `)
          .in("recipe_id", recipeIds)

        // Combinar recetas con categorías
        recipesWithProfiles = recipesWithProfiles.map((recipe) => ({
          ...recipe,
          categories:
            recipeCategories
              ?.filter((rc) => rc.recipe_id === recipe.id)
              ?.map((rc) => rc.categories)
              ?.filter(Boolean) || [],
        }))
      }

      console.log(`✅ Cargadas ${recipesWithProfiles.length} recetas reales y ${categories?.length || 0} categorías`)

      return {
        recipes: recipesWithProfiles,
        categories: categories || [],
      }
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error)

      if (attempt === retries) {
        console.log("🔄 No se pudieron cargar las recetas reales")
        return {
          recipes: [],
          categories: [],
        }
      }

      // Esperar antes del siguiente intento
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return { recipes: [], categories: [] }
}

export default async function RecipesPage() {
  const { recipes, categories } = await getRecipesWithRetry()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Link
          href="/recipes/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Añadir Receta
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold mb-4">No tienes recetas aún</h2>
          <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para crear tu colección personal</p>
          <Link
            href="/recipes/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Añadir Primera Receta
          </Link>
        </div>
      ) : (
        <Suspense fallback={<div className="text-center py-8">Cargando tus recetas...</div>}>
          <RecipesPageClient initialRecipes={recipes} categories={categories} />
        </Suspense>
      )}
    </div>
  )
}
