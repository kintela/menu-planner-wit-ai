"use client"

import { useState, useMemo } from "react"
import { RecipeSearch } from "./recipe-search"
import { RecipesClientFilter } from "./recipes-client-filter"
import { RecipeCard } from "./recipe-card"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean
  video_url: string | null
  source_url: string | null
  calories: number | null
  user_id: string
  created_at: string
  categories: Array<{ id: number; name: string }>
  user_profiles: {
    id: string
    full_name: string | null
    email: string
    alias: string | null
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
}

interface Category {
  id: number
  name: string
  recipeCount: number
}

interface RecipesPageClientProps {
  recipes: Recipe[]
  categories: Category[]
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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [onlyMyRecipes, setOnlyMyRecipes] = useState(showOnlyMyRecipes)

  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter((recipe) => recipe.categories.some((cat) => cat.id === selectedCategory))
    }

    // Filtrar por "mis recetas" (esto requeriría información del usuario actual)
    if (onlyMyRecipes) {
      // Por ahora, mostrar todas las recetas
      // En producción, aquí se filtrarían por user_id
    }

    return filtered
  }, [recipes, searchTerm, selectedCategory, onlyMyRecipes])

  return (
    <div className="space-y-6">
      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <RecipeSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        </div>
        <div className="flex gap-4">
          <RecipesClientFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onlyMyRecipes={onlyMyRecipes}
            onMyRecipesChange={setOnlyMyRecipes}
          />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredRecipes.length} de {totalRecipesCount} recetas
        {selectedCategory && <span> en la categoría "{categories.find((c) => c.id === selectedCategory)?.name}"</span>}
        {searchTerm && <span> que contienen "{searchTerm}"</span>}
      </div>

      {/* Grid de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-muted-foreground">Intenta ajustar los filtros o el término de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  )
}
