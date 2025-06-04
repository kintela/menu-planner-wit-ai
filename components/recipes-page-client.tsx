"use client"

import { useState } from "react"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"

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

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

interface RecipesPageClientProps {
  recipes: Recipe[]
  categories: CategoryWithCount[]
  totalRecipesCount: number
  showOnlyMyRecipes: boolean
}

export function RecipesPageClient({
  recipes,
  categories,
  totalRecipesCount,
  showOnlyMyRecipes,
}: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  const handleFiltersChange = (newSearchTerm: string, newSelectedCategories: number[]) => {
    setSearchTerm(newSearchTerm)
    setSelectedCategories(newSelectedCategories)
  }

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
  }

  return (
    <>
      {/* Filtros de búsqueda */}
      <div className="mb-6">
        <RecipeSearch
          categories={categories}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Resultados filtrados */}
      <RecipesClientFilter
        recipes={recipes}
        showOnlyMyRecipes={showOnlyMyRecipes}
        totalRecipesCount={totalRecipesCount}
        searchTerm={searchTerm}
        selectedCategories={selectedCategories}
        onClearFilters={handleClearFilters}
      />
    </>
  )
}
