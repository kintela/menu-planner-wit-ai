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

const getRecipesAndCategories = async (searchParams: { [key: string]: string | string[] | undefined }) => {
  const supabase = createServerComponentClient({ cookies })

  // Obtener todas las categorías con el conteo de recetas
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      created_at,
      recipes!inner(id)
    `)
    .order("name")

  if (categoriesError) {
    console.log("Error fetching categories:", categoriesError)
  }

  // Procesar categorías para obtener el conteo
  const categories: CategoryWithCount[] = (categoriesData || []).map((category: any) => ({
    id: category.id,
    name: category.name,
    created_at: category.created_at,
    recipeCount: category.recipes?.length || 0,
  }))

  // Construir la consulta de recetas con filtros
  let recipesQuery = supabase.from("recipes").select(`
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

  // Aplicar filtro de búsqueda por texto
  const search = searchParams.search as string
  if (search) {
    recipesQuery = recipesQuery.or(`name.ilike.%${search}%,ingredients.ilike.%${search}%`)
  }

  // Aplicar filtro por categorías - corregir el campo de filtrado
  const categoriesFilter = searchParams.categories as string
  if (categoriesFilter) {
    const categoryIds = categoriesFilter
      .split(",")
      .map((id) => Number.parseInt(id.trim()))
      .filter((id) => !isNaN(id))
    if (categoryIds.length > 0) {
      // Cambiar de category_id a categories.id para usar la relación
      recipesQuery = recipesQuery.in("categories.id", categoryIds)
    }
  }

  const { data: allRecipes, error: recipesError } = await recipesQuery.order("created_at", { ascending: false })

  if (recipesError) {
    console.log("Error fetching recipes:", recipesError)
    console.log("Query details:", { search, categoriesFilter })
  }

  return {
    recipes: (allRecipes as any) || [],
    categories,
    totalRecipesCount: allRecipes?.length || 0,
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount } = await getRecipesAndCategories(searchParams)

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
