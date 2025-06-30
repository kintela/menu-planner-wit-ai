"use client"

import { useState, useMemo } from "react"
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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showMyRecipes, setShowMyRecipes] = useState(showOnlyMyRecipes)

  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter((recipe) => recipe.categories.some((cat) => cat.id === selectedCategory))
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(term) ||
          recipe.ingredients.toLowerCase().includes(term) ||
          recipe.preparation.toLowerCase().includes(term),
      )
    }

    // Filtrar por "mis recetas"
    if (showMyRecipes) {
      filtered = filtered.filter((recipe) => recipe.user_id === "current-user")
    }

    return filtered
  }, [recipes, selectedCategory, searchTerm, showMyRecipes])

  const handleClearFilters = () => {
    setSelectedCategory(null)
    setSearchTerm("")
    setShowMyRecipes(false)
  }

  return (
    <div className="space-y-6">
      {/* Controles de filtrado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Selector de categorías */}
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.recipeCount})
              </option>
            ))}
          </select>

          {/* Filtro mis recetas */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showMyRecipes}
              onChange={(e) => setShowMyRecipes(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Solo mis recetas</span>
          </label>
        </div>

        {/* Búsqueda */}
        <input
          type="search"
          placeholder="Buscar recetas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Botón limpiar filtros */}
      {(selectedCategory || searchTerm || showMyRecipes) && (
        <div className="flex justify-center">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="text-sm text-gray-600">
        Mostrando {filteredRecipes.length} de {totalRecipesCount} recetas
      </div>

      {/* Grid de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory || showMyRecipes
              ? "Intenta ajustar los filtros de búsqueda"
              : "No hay recetas disponibles en este momento"}
          </p>
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
