import Link from "next/link"
import { PlusCircle, AlertCircle } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Recipe, Category } from "@/lib/types"

interface RecipesPageProps {
  searchParams: {
    search?: string
    categories?: string
  }
}

// Forzar renderizado dinámico
export const dynamic = "force-dynamic"

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  try {
    const supabase = createServerClient()

    // Obtener todas las categorías para el filtro
    const { data: categories } = await supabase.from("categories").select("*").order("name")

    // Obtener todas las recetas
    const { data: allRecipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      throw new Error(`Error fetching recipes: ${recipesError.message}`)
    }

    if (!allRecipes) {
      return (
        <div className="container py-10">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando recetas...</p>
            </div>
          </div>
        </div>
      )
    }

    // Obtener todas las relaciones receta-categoría
    const { data: recipeCategories, error: categoriesError } = await supabase.from("recipe_categories").select("*")

    if (categoriesError) {
      console.error("Error fetching recipe categories:", categoriesError)
    }

    // Crear un mapa de categorías por receta
    const recipeCategoriesMap = new Map<number, number[]>()
    allRecipes?.forEach((recipe) => {
      recipeCategoriesMap.set(recipe.id, [])
    })

    // Llenar el mapa con las categorías de cada receta
    recipeCategories?.forEach((rc) => {
      const recipeId = rc.recipe_id
      const categoryId = rc.category_id

      // Añadir la categoría a la receta
      if (recipeCategoriesMap.has(recipeId)) {
        recipeCategoriesMap.get(recipeId)?.push(categoryId)
      }
    })

    // Contar recetas por categoría
    const categoryCountMap = new Map<number, number>()
    categories?.forEach((cat) => {
      categoryCountMap.set(cat.id, 0)
    })

    recipeCategoriesMap.forEach((categoryIds, recipeId) => {
      categoryIds.forEach((categoryId) => {
        if (categoryCountMap.has(categoryId)) {
          categoryCountMap.set(categoryId, categoryCountMap.get(categoryId)! + 1)
        }
      })
    })

    // Combinar recetas con sus categorías
    const recipesWithCategories = allRecipes?.map((recipe) => {
      const categoryIds = recipeCategoriesMap.get(recipe.id) || []
      const recipeCategories = categoryIds
        .map((id) => {
          const category = categories?.find((c) => c.id === id)
          return category ? { id: category.id, name: category.name, created_at: category.created_at } : null
        })
        .filter(Boolean) as Category[]

      return {
        ...recipe,
        categories: recipeCategories,
      }
    })

    // Aplicar filtros
    let filteredRecipes = [...recipesWithCategories]

    // Filtrar por término de búsqueda
    if (searchParams.search && searchParams.search.trim()) {
      const searchTerm = searchParams.search.toLowerCase().trim()
      filteredRecipes = filteredRecipes.filter(
        (recipe: Recipe) =>
          recipe.name.toLowerCase().includes(searchTerm) ||
          (recipe.ingredients && recipe.ingredients.toLowerCase().includes(searchTerm)) ||
          (recipe.preparation && recipe.preparation.toLowerCase().includes(searchTerm)),
      )
    }

    // Filtrar por categorías
    if (searchParams.categories && searchParams.categories.trim()) {
      const categoryIds = searchParams.categories
        .split(",")
        .map((id) => Number.parseInt(id.trim()))
        .filter((id) => !isNaN(id))

      if (categoryIds.length > 0) {
        filteredRecipes = filteredRecipes.filter((recipe) => {
          const recipeCategoryIds = recipe.categories?.map((cat) => cat.id) || []
          return categoryIds.some((filterCatId) => recipeCategoryIds.includes(filterCatId))
        })
      }
    }

    // Información de las categorías seleccionadas para mostrar
    const selectedCategoryNames = searchParams.categories
      ? searchParams.categories
          .split(",")
          .map((id) => {
            const categoryId = Number.parseInt(id.trim())
            const category = categories?.find((cat) => cat.id === categoryId)
            return category?.name
          })
          .filter(Boolean)
      : []

    const hasActiveFilters = Boolean(searchParams.search || searchParams.categories)
    const displayedRecipes = filteredRecipes || []

    return (
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{hasActiveFilters ? "Resultados de búsqueda" : "Mis Recetas"}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-sm">
                {hasActiveFilters ? (
                  <>
                    Mostrando {displayedRecipes.length} de {recipesWithCategories.length} recetas
                  </>
                ) : (
                  <>Total: {recipesWithCategories.length} recetas</>
                )}
              </Badge>
              {hasActiveFilters && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/recipes">Ver todas las recetas</Link>
                </Button>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href="/recipes/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Receta
            </Link>
          </Button>
        </div>

        <RecipeSearch
          categories={
            categories?.map((cat) => ({
              ...cat,
              recipeCount: categoryCountMap.get(cat.id) || 0,
            })) || []
          }
        />

        <div className="mt-6">
          {hasActiveFilters && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Filtros aplicados:</h3>
              <div className="flex flex-wrap gap-2">
                {searchParams.search && <Badge variant="secondary">Búsqueda: "{searchParams.search}"</Badge>}
                {selectedCategoryNames.map((name, index) => (
                  <Badge key={index} variant="secondary">
                    Categoría: {name}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {displayedRecipes.length} receta(s) encontrada(s) de {recipesWithCategories.length} total
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedRecipes && displayedRecipes.length > 0 ? (
              displayedRecipes.map((recipe: Recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">
                  {hasActiveFilters
                    ? "No se encontraron recetas con los criterios seleccionados."
                    : "No hay recetas disponibles. ¡Añade tu primera receta!"}
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  {hasActiveFilters && (
                    <Button asChild variant="outline">
                      <Link href="/recipes">Ver todas las recetas</Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link href="/recipes/add">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Receta
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in RecipesPage:", error)

    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Mis Recetas</h1>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700 dark:text-red-300">
              No se puede conectar a la base de datos. Esto suele ocurrir cuando las variables de entorno no están
              configuradas correctamente.
            </p>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Error específico:</h3>
              <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                {error instanceof Error ? error.message : "Error desconocido"}
              </p>
            </div>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Variables requeridas:</h3>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <li>• NEXT_PUBLIC_SUPABASE_URL (debe ser una URL válida como https://tu-proyecto.supabase.co)</li>
                <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recipes/add">Añadir Receta</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
