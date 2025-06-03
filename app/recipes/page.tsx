import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  try {
    // Obtener todas las recetas sin filtros del servidor
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
      throw new Error("Failed to fetch recipes")
    }

    const recipes = (allRecipes as any) || []

    // Obtener todas las categorías
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      throw new Error("Failed to fetch categories")
    }

    // Obtener las relaciones receta-categoría
    const { data: recipeCategories, error: rcError } = await supabase.from("recipe_categories").select(`
        recipe_id,
        category_id,
        categories (
          id,
          name
        )
      `)

    if (rcError) {
      console.error("Error fetching recipe categories:", rcError)
      // No lanzar error aquí, solo log
    }

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
    // En caso de error, devolver datos vacíos pero válidos
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

  // Si no hay datos y hay parámetros de búsqueda, redirigir a la página limpia
  if (recipes.length === 0 && categories.length === 0 && Object.keys(searchParams).length > 0) {
    redirect("/recipes")
  }

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

      {/* Mostrar mensaje de error si no hay datos */}
      {recipes.length === 0 && categories.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            Hubo un problema cargando los datos. Por favor, intenta recargar la página.
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
