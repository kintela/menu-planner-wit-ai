import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import Link from "next/link"
import { Plus } from "lucide-react"

interface CategoryWithCount {
  id: number
  name: string
  created_at: string
  recipeCount: number
}

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  // Obtener todas las recetas sin filtros del servidor
  const { data: allRecipes, error: recipesError } = await supabase
    .from("recipes")
    .select(`
      *,
      categories (
        id,
        name
      ),
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

  // Obtener todas las categorías
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .order("name")

  if (categoriesError) {
    console.log("Error fetching categories:", categoriesError)
  }

  // Calcular el conteo de recetas por categoría
  const recipes = (allRecipes as any) || []

  // Debug: log para ver la estructura de las recetas
  console.log("Sample recipe structure:", recipes[0])

  const categories: CategoryWithCount[] = (categoriesData || []).map((category: any) => {
    // Contar recetas que tienen esta categoría
    const recipeCount = recipes.filter((recipe: any) => {
      // Verificar si la receta tiene categoría y si coincide con la categoría actual
      const hasCategory = recipe.categories && recipe.categories.id === category.id
      if (hasCategory) {
        console.log(`Recipe "${recipe.name}" belongs to category "${category.name}"`)
      }
      return hasCategory
    }).length

    console.log(`Category "${category.name}" has ${recipeCount} recipes`)

    return {
      id: category.id,
      name: category.name,
      created_at: category.created_at,
      recipeCount,
    }
  })

  console.log("Categories with counts:", categories)

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
