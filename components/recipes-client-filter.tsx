"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PlusCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Recipe {
  id: number
  name: string
  user_id: string
  ingredients?: string
  preparation?: string
  categories?: Array<{ id: number; name: string; created_at: string }>
  creator?: { full_name?: string; email?: string } | null
  [key: string]: any
}

interface RecipesClientFilterProps {
  recipes: Recipe[]
  showOnlyMyRecipes: boolean
  hasActiveFilters: boolean
  totalRecipesCount: number
  searchParams: {
    search?: string
    categories?: string
    my?: string
  }
}

export function RecipesClientFilter({
  recipes,
  showOnlyMyRecipes,
  hasActiveFilters,
  totalRecipesCount,
  searchParams,
}: RecipesClientFilterProps) {
  const { user } = useAuth()
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>(recipes)

  useEffect(() => {
    if (showOnlyMyRecipes && user?.id) {
      // Filtrar recetas del usuario actual
      const myRecipes = recipes.filter((recipe) => recipe.user_id === user.id)
      setFilteredRecipes(myRecipes)
    } else {
      // Mostrar todas las recetas
      setFilteredRecipes(recipes)
    }
  }, [recipes, showOnlyMyRecipes, user?.id])

  return (
    <div className="mt-6">
      {/* Información de estadísticas */}
      <div className="flex items-center gap-4 mb-4">
        <Badge variant="outline" className="text-sm">
          {hasActiveFilters ? (
            <>Mostrando {filteredRecipes.length} recetas</>
          ) : (
            <>
              {showOnlyMyRecipes ? "Mis recetas" : "Total"}: {filteredRecipes.length} recetas
              {showOnlyMyRecipes && totalRecipesCount && <> (de {totalRecipesCount} en total)</>}
            </>
          )}
        </Badge>
        {hasActiveFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/recipes">Limpiar filtros</Link>
          </Button>
        )}
      </div>

      {/* Filtros aplicados */}
      {(hasActiveFilters || showOnlyMyRecipes) && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Filtros aplicados:</h3>
          <div className="flex flex-wrap gap-2">
            {searchParams.search && <Badge variant="secondary">Búsqueda: "{searchParams.search}"</Badge>}
            {showOnlyMyRecipes && <Badge variant="secondary">Solo mis recetas</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{filteredRecipes.length} receta(s) encontrada(s)</p>
        </div>
      )}

      {/* Grid de recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes && filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "No se encontraron recetas con los criterios seleccionados."
                : showOnlyMyRecipes
                  ? "No has añadido ninguna receta todavía."
                  : "No hay recetas disponibles en el sistema."}
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
  )
}
