import Link from "next/link"
import { Plus } from "lucide-react"
import { RecipesPageClient } from "@/components/recipes-page-client"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

// Función para crear cliente mock si Supabase no está disponible
const createMockSupabaseClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }
}

export const getRecipesAndCategories = async () => {
  let supabase: any

  try {
    // Intentar importar y crear cliente real de Supabase
    const { createServerComponentClient } = await import("@supabase/auth-helpers-nextjs")
    const { cookies } = await import("next/headers")

    supabase = createServerComponentClient({ cookies })
  } catch (error) {
    console.warn("Supabase no disponible, usando cliente mock")
    supabase = createMockSupabaseClient()
  }

  try {
    console.log("🚀 Cargando recetas y categorías...")

    // Cargar recetas
    let recipes: any[] = []
    let hasFullRecipeData = false

    try {
      console.log("📋 Cargando recetas completas...")
      const recipesResult = await supabase
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

      if (recipesResult.error) {
        throw recipesResult.error
      }

      recipes = recipesResult.data || []
      hasFullRecipeData = true
      console.log(`✅ Recetas cargadas: ${recipes.length}`)
    } catch (error) {
      console.warn("⚠️ Error cargando recetas completas, intentando básicas:", error)

      try {
        const basicRecipesResult = await supabase
          .from("recipes")
          .select("id, name, ingredients, preparation, image_url, user_id, created_at, calories, is_ai_generated")
          .order("created_at", { ascending: false })

        if (basicRecipesResult.error) {
          throw basicRecipesResult.error
        }

        recipes = (basicRecipesResult.data || []).map((recipe: any) => ({
          ...recipe,
          user_profiles: null,
        }))
        console.log(`✅ Recetas básicas cargadas: ${recipes.length}`)
      } catch (fallbackError) {
        console.error("❌ Error en fallback de recetas:", fallbackError)
        recipes = []
      }
    }

    // Cargar categorías
    let categoriesData: any[] = []
    let hasCategoriesData = false

    try {
      console.log("📂 Cargando categorías...")
      const categoriesResult = await supabase.from("categories").select("id, name").order("name")

      if (categoriesResult.error) {
        throw categoriesResult.error
      }

      categoriesData = categoriesResult.data || []
      hasCategoriesData = true
      console.log(`✅ Categorías cargadas: ${categoriesData.length}`)
    } catch (error) {
      console.warn("⚠️ Error cargando categorías, usando fallback:", error)
      categoriesData = [
        { id: 1, name: "Desayuno" },
        { id: 2, name: "Almuerzo" },
        { id: 3, name: "Cena" },
        { id: 4, name: "Postre" },
        { id: 5, name: "Snacks" },
      ]
    }

    // Cargar relaciones receta-categoría
    let recipeCategories: any[] = []
    let hasRelationsData = false

    if (hasFullRecipeData && hasCategoriesData && recipes.length > 0) {
      try {
        console.log("🔗 Cargando relaciones receta-categoría...")
        const relationsResult = await supabase.from("recipe_categories").select(`
            recipe_id,
            category_id,
            categories (
              id,
              name
            )
          `)

        if (relationsResult.error) {
          throw relationsResult.error
        }

        recipeCategories = relationsResult.data || []
        hasRelationsData = true
        console.log(`✅ Relaciones cargadas: ${recipeCategories.length}`)
      } catch (error) {
        console.warn("⚠️ Error cargando relaciones:", error)
        recipeCategories = []
      }
    }

    // Procesar datos
    const recipeToCategories: { [key: number]: any[] } = {}
    recipeCategories.forEach((rc: any) => {
      if (!recipeToCategories[rc.recipe_id]) {
        recipeToCategories[rc.recipe_id] = []
      }
      if (rc.categories) {
        recipeToCategories[rc.recipe_id].push(rc.categories)
      }
    })

    // Enriquecer recetas con categorías
    const enrichedRecipes = recipes.map((recipe: any) => ({
      ...recipe,
      categories: recipeToCategories[recipe.id] || [],
    }))

    // Calcular conteo de recetas por categoría
    const categories: CategoryWithCount[] = categoriesData.map((category: any) => {
      const recipeCount = hasRelationsData
        ? enrichedRecipes.filter((recipe: any) => recipe.categories.some((cat: any) => cat.id === category.id)).length
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

export const getRecipeById = async (id: number) => {
  let supabase: any

  try {
    const { createServerComponentClient } = await import("@supabase/auth-helpers-nextjs")
    const { cookies } = await import("next/headers")

    supabase = createServerComponentClient({ cookies })
  } catch (error) {
    console.warn("Supabase no disponible para getRecipeById")
    return { recipe: null, error: "Supabase no disponible" }
  }

  try {
    console.log(`🔍 Obteniendo receta con ID: ${id}`)

    const { data: recipe, error } = await supabase
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
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error obteniendo receta:", error)
      return { recipe: null, error: error.message }
    }

    console.log("✅ Receta obtenida exitosamente")
    return { recipe, error: null }
  } catch (error) {
    console.error("❌ Error crítico obteniendo receta:", error)
    return { recipe: null, error: "Error interno del servidor" }
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount, dataQuality } = await getRecipesAndCategories()

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
        <RecipesPageClient
          recipes={recipes}
          categories={categories}
          totalRecipesCount={totalRecipesCount}
          showOnlyMyRecipes={showOnlyMyRecipes}
        />
      )}
    </div>
  )
}

export default Recipes
