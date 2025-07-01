"use client"

import { useState, useMemo } from "react"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import RecipeCard from "./recipe-card"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    full_name: string
    first_name: string
  }
  recipe_categories?: {
    categories: {
      id: number
      name: string
    }
  }[]
}

interface Category {
  id: number
  name: string
}

interface RecipesPageClientProps {
  initialRecipes: Recipe[]
  categories: Category[]
}

export default function RecipesPageClient({ initialRecipes, categories }: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Filtrar recetas
  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      // Filtro de búsqueda
      const matchesSearch =
        searchTerm === "" ||
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.preparation.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro de categorías
      const matchesCategory =
        selectedCategories.length === 0 ||
        recipe.recipe_categories?.some((rc) => selectedCategories.includes(rc.categories.id))

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchTerm, selectedCategories])

  // Contar recetas por categoría
  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: initialRecipes.filter((recipe) => recipe.recipe_categories?.some((rc) => rc.categories.id === category.id))
        .length,
    }))
  }, [categories, initialRecipes])

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
  }

  const hasActiveFilters = searchTerm !== "" || selectedCategories.length > 0

  return (
    <div className="space-y-6">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar recetas por nombre, ingredientes o preparación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCategories.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Filtrar por categoría</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriesWithCount.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-1"
              >
                {category.name}
                <Badge variant="secondary" className="ml-1">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Mostrando {filteredRecipes.length} de {initialRecipes.length} recetas
        </span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Grid de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600">
            {hasActiveFilters
              ? "Intenta ajustar tus filtros de búsqueda"
              : "Aún no tienes recetas. ¡Añade tu primera receta!"}
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
