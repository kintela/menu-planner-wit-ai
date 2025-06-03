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

// Función para esperar
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Función para hacer una consulta segura con manejo de rate limiting
async function safeQuery(supabase: any, queryFn: () => any, description: string) {
  try {
    console.log(`Attempting ${description}...`)
    const result = await queryFn()

    if (result.error) {
      console.error(`Error in ${description}:`, result.error)
      return { data: null, error: result.error }
    }

    console.log(`✅ ${description} successful:`, result.data?.length || 0, "records")
    return result
  } catch (error: any) {
    console.error(`❌ Exception in ${description}:`, error)

    // Si es un error de rate limiting, devolver un error específico
    if (error.message?.includes("Too Many") || error.message?.includes("SyntaxError")) {
      return { data: null, error: { message: "Rate limited", code: "RATE_LIMITED" } }
    }

    return { data: null, error }
  }
}

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    console.log("🚀 Starting ultra-conservative data fetch...")

    // Intentar cargar solo las recetas más básicas
    let recipes: any[] = []

    const recipesResult = await safeQuery(
      supabase,
      () =>
        supabase
          .from("recipes")
          .select("id, name, ingredients, preparation, image_url, user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(20), // Muy conservador
      "basic recipes fetch",
    )

    if (recipesResult.data) {
      recipes = recipesResult.data
    } else if (recipesResult.error?.code === "RATE_LIMITED") {
      console.warn("⚠️ Rate limited on recipes, using fallback")
      // Fallback con datos mínimos
      recipes = []
    }

    // Solo intentar categorías si las recetas funcionaron
    let categoriesData: any[] = []
    if (recipes.length > 0) {
      // Esperar más tiempo para evitar rate limiting
      await delay(1000)

      const categoriesResult = await safeQuery(
        supabase,
        () => supabase.from("categories").select("id, name").order("name").limit(10), // Muy conservador
        "basic categories fetch",
      )

      if (categoriesResult.data) {
        categoriesData = categoriesResult.data
      }
    }

    // No intentar relaciones por ahora para evitar más rate limiting
    console.log("📊 Skipping recipe-category relations to avoid rate limiting")

    // Procesar datos de forma simple
    const enrichedRecipes = recipes.map((recipe) => ({
      ...recipe,
      categories: [], // Sin categorías por ahora
      user_profiles: null,
    }))

    const categories: CategoryWithCount[] = categoriesData.map((category) => ({
      id: category.id,
      name: category.name,
      recipeCount: 0, // Sin conteo por ahora
    }))

    console.log("✅ Data processing completed:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
    }
  } catch (error) {
    console.error("💥 Critical error in getRecipesAndCategories:", error)

    // Fallback con datos estáticos mínimos
    return {
      recipes: [],
      categories: [
        { id: 1, name: "Desayuno", recipeCount: 0 },
        { id: 2, name: "Almuerzo", recipeCount: 0 },
        { id: 3, name: "Cena", recipeCount: 0 },
        { id: 4, name: "Postre", recipeCount: 0 },
      ],
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

      {/* Mensaje de estado */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="mb-6">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-semibold mb-2">Cargando recetas...</h2>
            <p className="text-muted-foreground mb-4">
              El servidor está experimentando alta demanda. Por favor, espera un momento.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                💡 <strong>Tip:</strong> Si esto persiste, intenta recargar la página en unos minutos.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/recipes"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Reintentar
            </Link>
            <Link
              href="/recipes/add"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ➕ Añadir Nueva Receta
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Advertencia de modo limitado */}
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">⚡</span>
              <p className="text-amber-800">
                <strong>Modo conservador activo:</strong> Mostrando funcionalidad básica para evitar sobrecarga del
                servidor.
              </p>
            </div>
          </div>

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
