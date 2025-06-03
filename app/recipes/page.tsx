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

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    console.log("🚀 Cargando datos completos...")

    // Cargar todas las recetas con información completa
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

    const recipes = (allRecipes as any) || []
    console.log(`✅ Cargadas ${recipes.length} recetas`)

    // Cargar todas las categorías
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    console.log(`✅ Cargadas ${categoriesData?.length || 0} categorías`)

    // Cargar relaciones receta-categoría
    const { data: recipeCategories, error: recipeCategoriesError } = await supabase.from("recipe_categories").select(`
        recipe_id,
        category_id,
        categories (
          id,
          name
        )
      `)

    if (recipeCategoriesError) {
      console.error("Error fetching recipe categories:", recipeCategoriesError)
      throw new Error(`Failed to fetch recipe categories: ${recipeCategoriesError.message}`)
    }

    console.log(`✅ Cargadas ${recipeCategories?.length || 0} relaciones receta-categoría`)

    // Crear un mapa de recetas a categorías
    const recipeToCategories: { [key: number]: any[] } = {}
    recipeCategories?.forEach((rc) => {
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
      creator: recipe.user_profiles,
    }))

    // Calcular el conteo de recetas por categoría
    const categories: CategoryWithCount[] = (categoriesData || []).map((category) => {
      const recipeCount = enrichedRecipes.filter((recipe) =>
        recipe.categories.some((cat: any) => cat.id === category.id),
      ).length

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    console.log("✅ Datos procesados completamente:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
      totalRelations: recipeCategories?.length || 0,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
    }
  } catch (error) {
    console.error("❌ Error cargando datos:", error)

    // Fallback básico en caso de error
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
          {/* Mostrar advertencia solo si hay problemas con categorías */}
          {categories.length === 0 && recipes.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800">
                ⚠️ Las categorías no se pudieron cargar completamente. Los filtros por categoría pueden no funcionar.
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
