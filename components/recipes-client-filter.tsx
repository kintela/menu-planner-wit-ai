"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PlusCircle, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  useEffect(() => {
    // Aplicar todos los filtros secuencialmente sobre el conjunto completo de recetas
    let filtered = [...recipes]

    // Filtrar por texto de búsqueda
    const searchText = searchParams.search?.toLowerCase()
    if (searchText) {
      filtered = filtered.filter((recipe) => {
        const nameMatch = recipe.name?.toLowerCase().includes(searchText)
        const ingredientsMatch = recipe.ingredients?.toLowerCase().includes(searchText)
        const preparationMatch = recipe.preparation?.toLowerCase().includes(searchText)
        return nameMatch || ingredientsMatch || preparationMatch
      })
    }

    // Filtrar por categorías seleccionadas
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
          return recipeCategories.some((category) => categoryIds.includes(category.id))
        })
      }
    }

    // Filtrar por "mis recetas"
    if (showOnlyMyRecipes && user?.id) {
      filtered = filtered.filter((recipe) => {
        return recipe.user_id === user.id || recipe.user_id === user.email
      })
    }

    console.log("Filtering results:", {
      originalCount: recipes.length,
      searchText,
      selectedCategories,
      showOnlyMyRecipes,
      filteredCount: filtered.length,
    })

    setFilteredRecipes(filtered)
  }, [recipes, searchParams.search, searchParams.categories, showOnlyMyRecipes, user?.id, user?.email])

  // Función mejorada para limpiar todos los filtros
  const clearAllFilters = () => {
    console.log("🧹 Limpiando todos los filtros...")

    // Limpiar el campo de búsqueda físicamente
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.value = ""
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    }

    // Desmarcar todos los checkboxes físicamente
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement && checkbox.checked) {
        checkbox.checked = false
        checkbox.dispatchEvent(new Event("change", { bubbles: true }))
      }
    })

    // Limpiar la función global si existe
    if (typeof window !== "undefined" && window.clearRecipeFilters) {
      window.clearRecipeFilters()
    }

    // Navegar a /recipes limpio
    router.replace("/recipes")

    // Forzar recarga como último recurso
    setTimeout(() => {
      if (window.location.pathname !== "/recipes" || window.location.search) {
        window.location.href = "/recipes"
      }
    }, 500)

    console.log("✅ Limpieza completada")
  }

  return (
    <div className="mt-6">
      {/* Información de estadísticas */}
      <div className="flex items-center gap-4 mb-4">
        <Badge variant="outline" className="text-sm">
          Mostrando {filteredRecipes.length} recetas
          {!hasActiveFilters && !showOnlyMyRecipes && <> de {totalRecipesCount} en total</>}
        </Badge>
        {(hasActiveFilters || showOnlyMyRecipes) && (
          <Button
            onClick={clearAllFilters}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm rounded-md shadow-md transition-colors flex items-center gap-1"
            data-testid="clear-all-filters-button"
          >
            <X className="h-3 w-3" />
            Limpiar filtros
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
