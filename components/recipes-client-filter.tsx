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
  categories?: Array<{ id: number; name: string }>
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
    // Comenzar con todas las recetas
    let filtered = [...recipes]

    console.log("Starting filter process with", filtered.length, "recipes")

    // PASO 1: Filtrar por "mis recetas" primero si está activo
    if (showOnlyMyRecipes && user?.id) {
      filtered = filtered.filter((recipe) => {
        return recipe.user_id === user.id || recipe.user_id === user.email
      })
      console.log("After 'my recipes' filter:", filtered.length, "recipes")
    }

    // PASO 2: Filtrar por categorías seleccionadas (encadenado)
    const selectedCategories = searchParams.categories
    if (selectedCategories) {
      const categoryIds = selectedCategories
        .split(",")
        .map((id) => Number.parseInt(id.trim()))
        .filter((id) => !isNaN(id))

      if (categoryIds.length > 0) {
        filtered = filtered.filter((recipe) => {
          // Verificar si la receta tiene alguna de las categorías seleccionadas
          const recipeCategories = recipe.categories || []
          const hasCategory = recipeCategories.some((category) => categoryIds.includes(category.id))
          return hasCategory
        })
        console.log("After category filter:", filtered.length, "recipes", "Categories:", categoryIds)
      }
    }

    // PASO 3: Filtrar por texto de búsqueda (encadenado con los filtros anteriores)
    const searchText = searchParams.search?.toLowerCase()
    if (searchText) {
      filtered = filtered.filter((recipe) => {
        const nameMatch = recipe.name?.toLowerCase().includes(searchText)
        const ingredientsMatch = recipe.ingredients?.toLowerCase().includes(searchText)
        const preparationMatch = recipe.preparation?.toLowerCase().includes(searchText)
        return nameMatch || ingredientsMatch || preparationMatch
      })
      console.log("After text search filter:", filtered.length, "recipes", "Search:", searchText)
    }

    console.log("Final filtering results:", {
      originalCount: recipes.length,
      finalCount: filtered.length,
      filters: {
        myRecipes: showOnlyMyRecipes,
        categories: selectedCategories,
        search: searchText,
      },
    })

    setFilteredRecipes(filtered)
  }, [recipes, searchParams.search, searchParams.categories, showOnlyMyRecipes, user?.id, user?.email])

  return (
    <div className="mt-6">
      {/* Información de estadísticas */}
      <div className="flex items-center gap-4 mb-4">
        <Badge variant="outline" className="text-sm">
          Mostrando {filteredRecipes.length} recetas
          {!hasActiveFilters && !showOnlyMyRecipes && <> de {totalRecipesCount} en total</>}
        </Badge>
        {(hasActiveFilters || showOnlyMyRecipes) && (
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
            {searchParams.categories && (
              <Badge variant="secondary">Categorías: {searchParams.categories.split(",").length} seleccionada(s)</Badge>
            )}
            {showOnlyMyRecipes && <Badge variant="secondary">Solo mis recetas</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {filteredRecipes.length} receta(s) encontrada(s) de {totalRecipesCount} totales
          </p>
        </div>
      )}

      {/* Grid de recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes && filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
        ) : (
          <div className="col-span-full text-center py-10">
            <p className="text-muted-foreground">
              {hasActiveFilters || showOnlyMyRecipes
                ? "No se encontraron recetas con los criterios seleccionados."
                : "No hay recetas disponibles en el sistema."}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              {(hasActiveFilters || showOnlyMyRecipes) && (
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
