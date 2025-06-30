import Link from "next/link"
import { Plus } from "lucide-react"
import { RecipesPageClient } from "@/components/recipes-page-client"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

// Datos mock para desarrollo
const getMockData = () => {
  const mockRecipes = [
    {
      id: 1,
      name: "Paella Valenciana",
      ingredients: "Arroz, pollo, verduras, azafrán",
      preparation: "Cocinar el arroz con los ingredientes en paellera...",
      image_url: "/placeholder.svg?height=200&width=300&text=Paella",
      is_ai_generated: false,
      video_url: null,
      source_url: null,
      calories: 450,
      created_at: "2024-01-01T00:00:00Z",
      user_id: "mock-user",
      categories: [{ id: 2, name: "Almuerzo" }],
      user_profiles: {
        id: "mock-user",
        full_name: "Chef Demo",
        email: "chef@demo.com",
        alias: "Chef",
        first_name: "Chef",
        last_name: "Demo",
        avatar_url: null,
      },
    },
    {
      id: 2,
      name: "Tortilla Española",
      ingredients: "Huevos, patatas, cebolla, aceite, sal",
      preparation: "Freír las patatas, batir los huevos y cuajar la tortilla...",
      image_url: "/placeholder.svg?height=200&width=300&text=Tortilla",
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
        full_name: "Chef Demo",
        email: "chef@demo.com",
        alias: "Chef",
        first_name: "Chef",
        last_name: "Demo",
        avatar_url: null,
      },
    },
  ]

  const mockCategories: CategoryWithCount[] = [
    { id: 1, name: "Desayuno", recipeCount: 1 },
    { id: 2, name: "Almuerzo", recipeCount: 1 },
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
    // Intentar usar Supabase real
    const { createClient } = await import("@/lib/supabase/server")
    const { safeQuery } = await import("@/lib/supabase/rate-limiter")

    const supabase = createClient()

    console.log("🚀 Cargando datos de Supabase...")

    // Cargar recetas
    const recipesData = await safeQuery(
      async () => {
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

    const recipes = recipesData.data || []
    console.log(`✅ Recetas cargadas: ${recipes.length}`)

    // Cargar categorías
    const categoriesData = await safeQuery(
      async () => {
        const result = await supabase.from("categories").select("id, name").order("name")
        return result
      },
      {
        endpoint: "categories",
        maxRetries: 2,
        baseDelay: 1000,
      },
    )

    if (categoriesData.error) {
      throw categoriesData.error
    }

    const categoriesRaw = categoriesData.data || []
    console.log(`✅ Categorías cargadas: ${categoriesRaw.length}`)

    // Cargar relaciones
    const relationsData = await safeQuery(
      async () => {
        const result = await supabase.from("recipe_categories").select(`
            recipe_id,
            category_id,
            categories (
              id,
              name
            )
          `)
        return result
      },
      {
        endpoint: "recipe-categories",
        maxRetries: 1,
        baseDelay: 1500,
      },
    )

    const recipeCategories = relationsData.data || []
    console.log(`✅ Relaciones cargadas: ${recipeCategories.length}`)

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
    const categories: CategoryWithCount[] = categoriesRaw.map((category: any) => {
      const recipeCount = enrichedRecipes.filter((recipe: any) =>
        recipe.categories.some((cat: any) => cat.id === category.id),
      ).length

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
      dataQuality: {
        hasFullRecipeData: true,
        hasCategoriesData: true,
        hasRelationsData: true,
      },
    }
  } catch (error) {
    console.warn("❌ Error cargando datos reales, usando mock:", error)
    return getMockData()
  }
}

export const getRecipeById = async (id: number) => {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = createClient()

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
