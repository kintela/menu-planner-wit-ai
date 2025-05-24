import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Button } from "@/components/ui/button"
import type { Recipe } from "@/lib/types"

interface SearchPageProps {
  searchParams: {
    search?: string
    categories?: string
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const supabase = createServerClient()

  console.log("Search params received:", searchParams)

  // Obtener todas las categorías para el filtro
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // Construir la consulta de búsqueda
  let query = supabase
    .from("recipes")
    .select("*, categories:recipe_categories(category:category_id(id, name))")
    .order("created_at", { ascending: false })

  let hasFilters = false

  // Filtrar por término de búsqueda
  if (searchParams.search) {
    hasFilters = true
    query = query.or(
      `name.ilike.%${searchParams.search}%,ingredients.ilike.%${searchParams.search}%,preparation.ilike.%${searchParams.search}%`,
    )
    console.log("Applied search filter:", searchParams.search)
  }

  // Filtrar por categorías
  if (searchParams.categories) {
    hasFilters = true
    const categoryIds = searchParams.categories.split(",").map(Number).filter(Boolean)
    console.log("Category IDs to filter:", categoryIds)

    if (categoryIds.length > 0) {
      // Obtener recetas que tengan al menos una de las categorías seleccionadas
      const { data: recipeIds, error: categoryError } = await supabase
        .from("recipe_categories")
        .select("recipe_id")
        .in("category_id", categoryIds)

      console.log("Recipe IDs found for categories:", recipeIds)

      if (categoryError) {
        console.error("Error fetching recipe categories:", categoryError)
      }

      if (recipeIds && recipeIds.length > 0) {
        const ids = [...new Set(recipeIds.map((r) => r.recipe_id))] // Eliminar duplicados
        query = query.in("id", ids)
        console.log("Filtering recipes by IDs:", ids)
      } else {
        // Si no hay recetas con esas categorías, devolver un array vacío
        console.log("No recipes found for selected categories")
        return (
          <div className="container py-10">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Resultados de búsqueda</h1>
              <Button asChild>
                <Link href="/recipes/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Receta
                </Link>
              </Button>
            </div>

            <RecipeSearch categories={categories || []} />

            <div className="text-center py-10">
              <p className="text-muted-foreground">No se encontraron recetas con los criterios seleccionados.</p>
              <Button asChild className="mt-4">
                <Link href="/recipes">Ver todas las recetas</Link>
              </Button>
            </div>
          </div>
        )
      }
    }
  }

  // Ejecutar la consulta
  const { data: recipes, error } = await query

  console.log("Query executed, recipes found:", recipes?.length || 0)

  if (error) {
    console.error("Error searching recipes:", error)
  }

  // Transformar los datos para que coincidan con el tipo Recipe
  const formattedRecipes = recipes?.map((recipe: any) => ({
    ...recipe,
    categories: recipe.categories?.map((item: any) => item.category).filter(Boolean) || [],
  }))

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{hasFilters ? "Resultados de búsqueda" : "Todas las recetas"}</h1>
        <Button asChild>
          <Link href="/recipes/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Receta
          </Link>
        </Button>
      </div>

      <RecipeSearch categories={categories || []} />

      <div className="mt-6">
        {hasFilters && (
          <p className="text-sm text-muted-foreground mb-4">{formattedRecipes?.length || 0} receta(s) encontrada(s)</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formattedRecipes && formattedRecipes.length > 0 ? (
            formattedRecipes.map((recipe: Recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">
                {hasFilters
                  ? "No se encontraron recetas con los criterios seleccionados."
                  : "No hay recetas disponibles."}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                {hasFilters && (
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
}
