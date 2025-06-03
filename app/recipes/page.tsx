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
    // Obtener todas las recetas
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
      return { recipes: [], categories: [], totalRecipesCount: 0 }
    }

    // Obtener todas las categorías
    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return { recipes: allRecipes || [], categories: [], totalRecipesCount: (allRecipes || []).length }
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
    const recipes = (allRecipes || []).map((recipe) => ({
      ...recipe,
      categories: recipeToCategories[recipe.id] || [],
    }))

    // Calcular el conteo de recetas por categoría
    const categories: CategoryWithCount[] = (categoriesData || []).map((category) => {
      const recipeCount = recipes.filter((recipe) =>
        recipe.categories.some((cat: any) => cat.id === category.id),
      ).length

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    console.log("Data loaded successfully:", {
      recipesCount: recipes.length,
      categoriesCount: categories.length,
      sampleRecipe: recipes[0],
    })

    return {
      recipes,
      categories,
      totalRecipesCount: recipes.length,
    }
  } catch (error) {
    console.error("Error in getRecipesAndCategories:", error)
    return { recipes: [], categories: [], totalRecipesCount: 0 }
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
    </div>
  )
}

export default Recipes
