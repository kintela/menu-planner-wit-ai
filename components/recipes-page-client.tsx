"use client"

import { useState, useMemo } from "react"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { CategorySelector } from "@/components/category-selector"
import { MyRecipesFilter } from "@/components/my-recipes-filter"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated?: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    id: string
    full_name?: string
    first_name?: string
    last_name?: string
    alias?: string
    avatar_url?: string
    email?: string
  }
  recipe_categories?: Array<{
    categories: {
      id: number
      name: string
    }
  }>
}

interface Category {
  id: number
  name: string
}

interface RecipesPageClientProps {
  initialRecipes: Recipe[]
  initialCategories: Category[]
}

export function RecipesPageClient({ initialRecipes = [], initialCategories = [] }: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [showMyRecipes, setShowMyRecipes] = useState(false)

  const filteredRecipes = useMemo(() => {
    if (!Array.isArray(initialRecipes)) return []

    return initialRecipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategories.length === 0 ||
        (recipe.recipe_categories &&
          recipe.recipe_categories.some((rc) => selectedCategories.includes(rc.categories.id)))

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchTerm, selectedCategories])

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    setShowMyRecipes(false)
  }

  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || showMyRecipes

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/recipes/add">Añadir Receta</Link>
        </Button>
      </div>

      <div className="space-y-4">
        <RecipeSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <div className="flex flex-wrap gap-4 items-center">
          <CategorySelector
            categories={initialCategories}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
          />

          <MyRecipesFilter showMyRecipes={showMyRecipes} onToggle={setShowMyRecipes} />

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay recetas disponibles</h3>
          <p className="text-gray-600 mb-4">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/recipes/add">Añadir Primera Receta</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
