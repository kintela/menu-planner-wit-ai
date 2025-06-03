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
    console.log("Error fetching recipes:", recipesError)
  }

  // Obtener la información de categorías y conteos desde nuestra API de debug
  let categories: CategoryWithCount[] = []
  let recipes = (allRecipes as any) || []

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || ""}/api/debug-categories`, {
      cache: "no-store",
    })

    if (response.ok) {
      const data = await response.json()
      categories = data.categoryCounts

      // Enriquecer las recetas con información de categorías
      const { data: recipesWithCategories } = await supabase.from("recipe_categories").select(`
          recipe_id,
          category_id,
          categories (
            id,
            name
          )
        `)

      // Crear un mapa de recetas a categorías
      const recipeToCategories = {}
      recipesWithCategories?.forEach((rc) => {
        if (!recipeToCategories[rc.recipe_id]) {
          recipeToCategories[rc.recipe_id] = []
        }
        recipeToCategories[rc.recipe_id].push(rc.categories)
      })

      // Añadir categorías a cada receta
      recipes = recipes.map((recipe) => ({
        ...recipe,
        categories: recipeToCategories[recipe.id] || [],
      }))
    }
  } catch (error) {
    console.error("Error fetching category counts:", error)
  }

  return {
    recipes,
    categories,
    totalRecipesCount: recipes.length,
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
