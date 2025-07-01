import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { rateLimiter } from "@/lib/supabase/rate-limiter"
import RecipesPageClient from "@/components/recipes-page-client"

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
  }
  recipe_categories?: {
    categories: {
      id: number
      name: string
    }
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
      console.log(`🔄 Intento ${attempt}/${retries} - Cargando recetas...`)

      if (!(await rateLimiter.checkLimit(cacheKey))) {
        console.log("⏳ Rate limit alcanzado, esperando...")
        await rateLimiter.waitForSlot(cacheKey)
      }

      const supabase = createClient()

      // Cargar recetas con relaciones
      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select(`
          *,
          user_profiles!recipes_user_id_fkey (
            full_name,
            first_name
          ),
          recipe_categories (
            categories (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      // Cargar categorías
      const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

      if (recipesError && categoriesError) {
        throw new Error(`Recipes: ${recipesError.message}, Categories: ${categoriesError.message}`)
      }

      console.log(`✅ Cargadas ${recipes?.length || 0} recetas y ${categories?.length || 0} categorías`)

      return {
        recipes: recipes || [],
        categories: categories || [],
      }
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error)

      if (attempt === retries) {
        console.log("🔄 Usando datos de respaldo...")
        return {
          recipes: [],
          categories: [
            { id: 1, name: "Desayuno" },
            { id: 2, name: "Almuerzo" },
            { id: 3, name: "Cena" },
            { id: 4, name: "Postre" },
            { id: 5, name: "Snacks" },
          ],
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
        <a href="/recipes/add" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
          + Añadir Receta
        </a>
      </div>

      <Suspense fallback={<div className="text-center py-8">Cargando recetas...</div>}>
        <RecipesPageClient initialRecipes={recipes} categories={categories} />
      </Suspense>
    </div>
  )
}
