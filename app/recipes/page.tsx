import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import Link from "next/link"
import { Plus } from "lucide-react"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

// Función helper para retry con backoff exponencial
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw error
      }

      // Si es un error de rate limiting, esperar antes de reintentar
      if (error.message?.includes("Too Many") || error.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        // Para otros errores, no reintentar
        throw error
      }
    }
  }

  throw lastError!
}

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    console.log("Starting data fetch...")

    // Obtener recetas con retry
    const recipes = await retryWithBackoff(async () => {
      const { data: allRecipes, error: recipesError } = await supabase
        .from("recipes")
        .select(`
          *,
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
        .order("created_at", { ascending: false })

      if (recipesError) {
        console.error("Error fetching recipes:", recipesError)
        throw new Error(`Failed to fetch recipes: ${recipesError.message}`)
      }

      return (allRecipes as any) || []
    })

    console.log(`Fetched ${recipes.length} recipes`)

    // Pequeño delay para evitar rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Obtener categorías con retry
    const categoriesData = await retryWithBackoff(async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name")

      if (error) {
        console.error("Error fetching categories:", error)
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }

      return data || []
    })

    console.log(`Fetched ${categoriesData.length} categories`)

    // Otro pequeño delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Obtener relaciones receta-categoría con retry
    let recipeCategories: any[] = []
    try {
      recipeCategories = await retryWithBackoff(async () => {
        const { data, error } = await supabase.from("recipe_categories").select(`
            recipe_id,
            category_id,
            categories (
              id,
              name
            )
          `)

        if (error) {
          console.error("Error fetching recipe categories:", error)
          throw new Error(`Failed to fetch recipe categories: ${error.message}`)
        }

        return data || []
      })
    } catch (error) {
      console.warn("Failed to fetch recipe categories, continuing without them:", error)
      // Continuar sin las relaciones de categorías
    }

    console.log(`Fetched ${recipeCategories.length} recipe-category relations`)

    // Crear un mapa de recetas a categorías
    const recipeToCategories: { [key: number]: any[] } = {}
    recipeCategories.forEach((rc) => {
      if (!recipeToCategories[rc.recipe_id]) {
        recipeToCategories[rc.recipe_id] = []
      }
      if (rc.categories) {
        recipeToCategories[rc.recipe_id].push(rc.categories)
      }
    })

    // Enriquecer las recetas con sus categorías
    const enrichedRecipes = recipes.map((recipe) => ({
      ...recipe,
      categories: recipeToCategories[recipe.id] || [],
    }))

    // Calcular el conteo de recetas por categoría
    const categories: CategoryWithCount[] = categoriesData.map((category) => {
      const recipeCount = enrichedRecipes.filter((recipe) =>
        recipe.categories.some((cat: any) => cat.id === category.id),
      ).length

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    console.log("Data loaded successfully:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
    }
  } catch (error) {
    console.error("Error in getRecipesAndCategories:", error)

    // En caso de error, intentar cargar al menos las recetas básicas
    try {
      const { data: basicRecipes } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20) // Limitar para evitar rate limiting

      return {
        recipes: (basicRecipes || []).map((recipe) => ({ ...recipe, categories: [] })),
        categories: [],
        totalRecipesCount: basicRecipes?.length || 0,
      }
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError)
      return {
        recipes: [],
        categories: [],
        totalRecipesCount: 0,
      }
    }
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount } = await getRecipesAndCategories()

  // Verificar si hay filtros activos
  const hasActiveFilters = !!(searchParams.search || searchParams.categories || searchParams.my)
  const showOnlyMyRecipes = searchParams.my === "true"

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Link
          href="/recipes/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir Receta
        </Link>
      </div>

      {/* Mostrar mensaje si hay problemas con los datos */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            {categories.length === 0
              ? "Hubo un problema cargando los datos. Por favor, intenta recargar la página."
              : "No hay recetas disponibles en el sistema."}
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/recipes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Recargar
            </Link>
            <Link href="/recipes/add" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Añadir Receta
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mostrar advertencia si no se pudieron cargar las categorías */}
          {categories.length === 0 && recipes.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800">
                ⚠️ Las categorías no se pudieron cargar completamente. Los filtros pueden no funcionar correctamente.
              </p>
            </div>
          )}

          {/* Filtros de búsqueda */}
          <div className="mb-6">
            <RecipeSearch categories={categories} />
          </div>

          {/* Resultados filtrados */}
          <RecipesClientFilter
            recipes={recipes}
            showOnlyMyRecipes={showOnlyMyRecipes}
            hasActiveFilters={hasActiveFilters}
            totalRecipesCount={totalRecipesCount}
            searchParams={searchParams}
          />
        </>
      )}
    </div>
  )
}

export default Recipes
