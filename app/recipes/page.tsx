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

// Función para parsear errores de Supabase que pueden no ser JSON
function parseSupabaseError(error: any): string {
  if (typeof error === "string") {
    return error
  }
  if (error?.message) {
    return error.message
  }
  if (error?.error_description) {
    return error.error_description
  }
  return "Unknown error occurred"
}

// Función para esperar con delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    console.log("Starting simplified data fetch...")

    // Intentar cargar solo recetas básicas primero
    let recipes: any[] = []
    try {
      console.log("Fetching recipes...")
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select(`
          id,
          name,
          ingredients,
          preparation,
          image_url,
          video_url,
          source_url,
          calories,
          user_id,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(50) // Limitar para evitar rate limiting

      if (recipesError) {
        const errorMsg = parseSupabaseError(recipesError)
        console.error("Error fetching recipes:", errorMsg)
        throw new Error(`Failed to fetch recipes: ${errorMsg}`)
      }

      recipes = recipesData || []
      console.log(`Successfully fetched ${recipes.length} recipes`)
    } catch (error) {
      console.error("Failed to fetch recipes:", error)
      // Continuar con array vacío
      recipes = []
    }

    // Esperar un poco antes de la siguiente consulta
    await delay(500)

    // Intentar cargar categorías
    let categoriesData: any[] = []
    try {
      console.log("Fetching categories...")
      const { data, error } = await supabase.from("categories").select("id, name").order("name")

      if (error) {
        const errorMsg = parseSupabaseError(error)
        console.error("Error fetching categories:", errorMsg)
        throw new Error(`Failed to fetch categories: ${errorMsg}`)
      }

      categoriesData = data || []
      console.log(`Successfully fetched ${categoriesData.length} categories`)
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      // Continuar con array vacío
      categoriesData = []
    }

    // Esperar antes de la siguiente consulta
    await delay(500)

    // Intentar cargar relaciones (opcional)
    let recipeCategories: any[] = []
    if (recipes.length > 0 && categoriesData.length > 0) {
      try {
        console.log("Fetching recipe-category relations...")
        const { data, error } = await supabase.from("recipe_categories").select(`
            recipe_id,
            category_id,
            categories!inner (
              id,
              name
            )
          `)

        if (error) {
          const errorMsg = parseSupabaseError(error)
          console.warn("Error fetching recipe categories (non-critical):", errorMsg)
        } else {
          recipeCategories = data || []
          console.log(`Successfully fetched ${recipeCategories.length} recipe-category relations`)
        }
      } catch (error) {
        console.warn("Failed to fetch recipe categories (continuing without them):", error)
      }
    }

    // Procesar datos
    const recipeToCategories: { [key: number]: any[] } = {}
    recipeCategories.forEach((rc) => {
      if (!recipeToCategories[rc.recipe_id]) {
        recipeToCategories[rc.recipe_id] = []
      }
      if (rc.categories) {
        recipeToCategories[rc.recipe_id].push(rc.categories)
      }
    })

    // Enriquecer recetas con categorías
    const enrichedRecipes = recipes.map((recipe) => ({
      ...recipe,
      categories: recipeToCategories[recipe.id] || [],
      user_profiles: null, // Simplificar por ahora
    }))

    // Calcular conteos de categorías
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

    console.log("Data processing completed:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
      hasRelations: recipeCategories.length > 0,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
    }
  } catch (error) {
    console.error("Critical error in getRecipesAndCategories:", error)

    // Fallback extremo: devolver estructura mínima
    return {
      recipes: [],
      categories: [],
      totalRecipesCount: 0,
    }
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount } = await getRecipesAndCategories()

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

      {/* Estado de carga/error */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Cargando recetas...</h2>
            <p className="text-muted-foreground">
              Si esto tarda mucho, puede haber problemas temporales con el servidor.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href="/recipes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              🔄 Reintentar
            </Link>
            <Link href="/recipes/add" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              ➕ Añadir Receta
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Advertencia si hay problemas parciales */}
          {categories.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800">⚠️ Modo simplificado: Las categorías no están disponibles temporalmente.</p>
            </div>
          )}

          {/* Filtros de búsqueda */}
          <div className="mb-6">
            <RecipeSearch categories={categories} />
          </div>

          {/* Resultados */}
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
