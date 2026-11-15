import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { cookies } from "next/headers"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Button } from "@/components/ui/button"
import { readPublicCategories, readRecipeListing } from "@/lib/recipes/recipe-server-operations"
import { createClient } from "@/lib/supabase/server"

interface SearchPageProps {
  searchParams: Promise<{ search?: string; categories?: string }> | { search?: string; categories?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const filters = await Promise.resolve(searchParams)
  const supabase = createClient(await cookies())
  const [recipeResult, categoryResult] = await Promise.all([readRecipeListing(supabase), readPublicCategories(supabase)])
  const recipes = recipeResult.status === 200 && "recipes" in recipeResult.body ? recipeResult.body.recipes : []
  const categories = categoryResult.status === 200 && "categories" in categoryResult.body ? categoryResult.body.categories : []
  const term = filters.search?.trim().toLocaleLowerCase("es") || ""
  const categoryIds = new Set((filters.categories || "").split(",").map(Number).filter(Number.isSafeInteger))
  const categoriesWithCounts = categories.map((category) => ({
    id: category.id,
    name: category.name,
    recipeCount: recipes.filter((recipe) => recipe.categories.some((item) => item.id === category.id)).length,
  }))
  const hasFilters = Boolean(term || categoryIds.size)
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesText = !term || recipe.name.toLocaleLowerCase("es").includes(term)
      || recipe.ingredients.toLocaleLowerCase("es").includes(term)
      || String(recipe.id) === term
    const matchesCategory = categoryIds.size === 0 || recipe.categories.some((category) => categoryIds.has(category.id))
    return matchesText && matchesCategory
  })

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{hasFilters ? "Resultados de búsqueda" : "Todas las recetas"}</h1>
        <Button asChild><Link href="/recipes/add"><PlusCircle className="mr-2 h-4 w-4" />Añadir Receta</Link></Button>
      </div>
      <RecipeSearch categories={categoriesWithCounts} />
      <div className="mt-6">
        {hasFilters && <p className="text-sm text-muted-foreground mb-4">{filteredRecipes.length} receta(s) encontrada(s)</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.length > 0 ? filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">{hasFilters ? "No se encontraron recetas con los criterios seleccionados." : "No hay recetas disponibles."}</p>
              {hasFilters && <Button asChild variant="outline" className="mt-4"><Link href="/recipes">Ver todas las recetas</Link></Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
