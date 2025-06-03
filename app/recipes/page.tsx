import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import Link from "next/link"
import { Plus } from "lucide-react"
import { safeQuery } from "@/lib/supabase/rate-limiter"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    console.log("🚀 Cargando datos con protección de rate limiting...")

    // Paso 1: Cargar recetas básicas primero
    let recipes: any[] = []
    let hasFullRecipeData = false

    try {
      console.log("📋 Intentando cargar recetas completas...")
      const recipesData = await safeQuery(
        async () => {
          try {
            const result = await supabase
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

            return result
          } catch (error) {
            console.error("Error interno en consulta de recetas:", error)
            return { data: null, error }
          }
        },
        {
          endpoint: "recipes-full",
          maxRetries: 2,
          baseDelay: 1000,
        },
      )

      if (recipesData.error) {
        throw recipesData.error
      }

      recipes = recipesData.data || []
      hasFullRecipeData = true
      console.log(`✅ Recetas completas cargadas: ${recipes.length}`)
    } catch (error) {
      console.warn("⚠️ Fallback a recetas básicas debido a rate limiting o error:", error)

      // Fallback: cargar solo datos básicos de recetas
      try {
        const basicRecipesData = await safeQuery(
          async () => {
            try {
              const result = await supabase
                .from("recipes")
                .select("id, name, ingredients, preparation, image_url, user_id, created_at")
                .order("created_at", { ascending: false })
                .limit(50)

              return result
            } catch (error) {
              console.error("Error interno en consulta de recetas básicas:", error)
              return { data: null, error }
            }
          },
          {
            endpoint: "recipes-basic",
            maxRetries: 1,
            baseDelay: 2000,
          },
        )

        if (basicRecipesData.error) {
          throw basicRecipesData.error
        }

        recipes = (basicRecipesData.data || []).map((recipe) => ({
          ...recipe,
          user_profiles: null,
        }))
        console.log(`✅ Recetas básicas cargadas: ${recipes.length}`)
      } catch (fallbackError) {
        console.error("❌ Error en fallback de recetas:", fallbackError)
        recipes = []
      }
    }

    // Paso 2: Cargar categorías con delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    let categoriesData: any[] = []
    let hasCategoriesData = false

    try {
      console.log("📂 Intentando cargar categorías...")
      const categoriesResult = await safeQuery(
        async () => {
          try {
            const result = await supabase.from("categories").select("id, name").order("name")
            return result
          } catch (error) {
            console.error("Error interno en consulta de categorías:", error)
            return { data: null, error }
          }
        },
        {
          endpoint: "categories",
          maxRetries: 2,
          baseDelay: 1000,
        },
      )

      if (categoriesResult.error) {
        throw categoriesResult.error
      }

      categoriesData = categoriesResult.data || []
      hasCategoriesData = true
      console.log(`✅ Categorías cargadas: ${categoriesData.length}`)
    } catch (error) {
      console.warn("⚠️ Error cargando categorías, usando fallback estático:", error)
      categoriesData = [
        { id: 1, name: "Desayuno" },
        { id: 2, name: "Almuerzo" },
        { id: 3, name: "Cena" },
        { id: 4, name: "Postre" },
        { id: 5, name: "Snacks" },
      ]
    }

    // Paso 3: Cargar relaciones solo si tenemos datos completos
    await new Promise((resolve) => setTimeout(resolve, 500))

    let recipeCategories: any[] = []
    let hasRelationsData = false

    if (hasFullRecipeData && hasCategoriesData && recipes.length > 0) {
      try {
        console.log("🔗 Intentando cargar relaciones receta-categoría...")
        const relationsResult = await safeQuery(
          async () => {
            try {
              const result = await supabase.from("recipe_categories").select(`
                  recipe_id,
                  category_id,
                  categories (
                    id,
                    name
                  )
                `)
              return result
            } catch (error) {
              console.error("Error interno en consulta de relaciones:", error)
              return { data: null, error }
            }
          },
          {
            endpoint: "recipe-categories",
            maxRetries: 1,
            baseDelay: 1500,
          },
        )

        if (relationsResult.error) {
          throw relationsResult.error
        }

        recipeCategories = relationsResult.data || []
        hasRelationsData = true
        console.log(`✅ Relaciones cargadas: ${recipeCategories.length}`)
      } catch (error) {
        console.warn("⚠️ Error cargando relaciones, continuando sin ellas:", error)
        recipeCategories = []
      }
    } else {
      console.log("⏭️ Saltando relaciones debido a datos incompletos")
    }

    // Paso 4: Procesar datos
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
      const recipeCount = hasRelationsData
        ? enrichedRecipes.filter((recipe) => recipe.categories.some((cat: any) => cat.id === category.id)).length
        : 0

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    console.log("✅ Procesamiento completado:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
      hasFullData: hasFullRecipeData && hasCategoriesData && hasRelationsData,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
      dataQuality: {
        hasFullRecipeData,
        hasCategoriesData,
        hasRelationsData,
      },
    }
  } catch (error) {
    console.error("❌ Error crítico:", error)

    return {
      recipes: [],
      categories: [
        { id: 1, name: "Desayuno", recipeCount: 0 },
        { id: 2, name: "Almuerzo", recipeCount: 0 },
        { id: 3, name: "Cena", recipeCount: 0 },
        { id: 4, name: "Postre", recipeCount: 0 },
      ],
      totalRecipesCount: 0,
      dataQuality: {
        hasFullRecipeData: false,
        hasCategoriesData: false,
        hasRelationsData: false,
      },
    }
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount, dataQuality } = await getRecipesAndCategories()

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

      {/* Mostrar estado de los datos */}
      {!dataQuality.hasFullRecipeData && recipes.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">ℹ️</span>
            <p className="text-blue-800">
              <strong>Modo adaptativo:</strong> Algunos datos se cargaron de forma simplificada para optimizar el
              rendimiento.
              {!dataQuality.hasRelationsData && " Los filtros por categoría pueden tener conteos limitados."}
            </p>
          </div>
        </div>
      )}

      {/* Mostrar mensaje si no hay datos */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="mb-6">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold mb-2">No hay recetas disponibles</h2>
            <p className="text-muted-foreground mb-4">
              {categories.length === 0
                ? "Hubo un problema cargando los datos. Por favor, intenta recargar la página."
                : "Sé el primero en añadir una receta al sistema."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/recipes"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 Recargar
            </Link>
            <Link
              href="/recipes/add"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ➕ Añadir Primera Receta
            </Link>
          </div>
        </div>
      ) : (
        <>
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
