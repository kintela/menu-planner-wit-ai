import Link from "next/link"
import { Plus } from "lucide-react"
import { RecipesPageClient } from "@/components/recipes-page-client"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

// Mock data for v0 environment
const getMockData = () => {
  const mockRecipes = [
    {
      id: 1,
      name: "Paella Valenciana",
      ingredients: "Arroz, pollo, verduras, azafrán",
      preparation: "Cocinar el arroz con los ingredientes...",
      image_url: "/placeholder.svg?height=200&width=300",
      is_ai_generated: false,
      video_url: null,
      source_url: null,
      calories: 450,
      created_at: "2024-01-01T00:00:00Z",
      user_id: "mock-user",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "mock-user",
        full_name: "Usuario Demo",
        email: "demo@example.com",
        alias: "Demo",
        first_name: "Usuario",
        last_name: "Demo",
        avatar_url: null,
      },
    },
    {
      id: 2,
      name: "Tortilla Española",
      ingredients: "Huevos, patatas, cebolla, aceite, sal",
      preparation: "Freír las patatas, batir los huevos...",
      image_url: "/placeholder.svg?height=200&width=300",
      is_ai_generated: false,
      video_url: null,
      source_url: null,
      calories: 320,
      created_at: "2024-01-02T00:00:00Z",
      user_id: "mock-user",
      categories: [
        { id: 1, name: "Desayuno" },
        { id: 3, name: "Cena" },
      ],
      user_profiles: {
        id: "mock-user",
        full_name: "Usuario Demo",
        email: "demo@example.com",
        alias: "Demo",
        first_name: "Usuario",
        last_name: "Demo",
        avatar_url: null,
      },
    },
    {
      id: 3,
      name: "Gazpacho Andaluz",
      ingredients: "Tomate, pepino, pimiento, ajo, pan, aceite",
      preparation: "Triturar todos los ingredientes...",
      image_url: "/placeholder.svg?height=200&width=300",
      is_ai_generated: true,
      video_url: null,
      source_url: null,
      calories: 180,
      created_at: "2024-01-03T00:00:00Z",
      user_id: "mock-user",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "mock-user",
        full_name: "Usuario Demo",
        email: "demo@example.com",
        alias: "Demo",
        first_name: "Usuario",
        last_name: "Demo",
        avatar_url: null,
      },
    },
  ]

  const mockCategories: CategoryWithCount[] = [
    { id: 1, name: "Desayuno", recipeCount: 1 },
    { id: 2, name: "Almuerzo", recipeCount: 2 },
    { id: 3, name: "Cena", recipeCount: 1 },
    { id: 4, name: "Postre", recipeCount: 0 },
    { id: 5, name: "Snacks", recipeCount: 0 },
  ]

  return {
    recipes: mockRecipes,
    categories: mockCategories,
    totalRecipesCount: mockRecipes.length,
    dataQuality: {
      hasFullRecipeData: true,
      hasCategoriesData: true,
      hasRelationsData: true,
    },
  }
}

export const getRecipesAndCategories = async () => {
  try {
    // Try to use real Supabase if available
    const { createServerComponentClient } = require("@supabase/auth-helpers-nextjs")
    const { cookies } = require("next/headers")
    const { safeQuery } = require("@/lib/supabase/rate-limiter")

    const supabase = createServerComponentClient({ cookies })

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
    console.warn("❌ Supabase not available, using mock data:", error)
    return getMockData()
  }
}

export const getRecipeById = async (id: number) => {
  try {
    const { createServerComponentClient } = require("@supabase/auth-helpers-nextjs")
    const { cookies } = require("next/headers")

    const supabase = createServerComponentClient({ cookies })

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
