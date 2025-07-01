"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import RecipeCard from "@/components/recipe-card"

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
    last_name: string
    alias: string
    avatar_url: string
    email: string
  }
  categories?: {
    id: number
    name: string
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

  // Filtrar recetas
  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      // Filtro por búsqueda
      const matchesSearch =
        searchTerm === "" ||
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.preparation.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro por categorías
      const matchesCategory =
        selectedCategories.length === 0 ||
        (recipe.categories && recipe.categories.some((cat) => selectedCategories.includes(cat.id)))

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchTerm, selectedCategories])

  // Contar recetas por categoría
  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: initialRecipes.filter((recipe) => recipe.categories?.some((cat) => cat.id === category.id)).length,
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
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar recetas por nombre, ingredientes o preparación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros por categoría */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Categorías</h3>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {categoriesWithCount.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategories.includes(category.id) ? "default" : "outline"}
              className="cursor-pointer hover:bg-blue-100"
              onClick={() => toggleCategory(category.id)}
            >
              {category.name} ({category.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{filteredRecipes.length}</div>
            <div className="text-sm text-gray-600">Recetas mostradas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{initialRecipes.length}</div>
            <div className="text-sm text-gray-600">Total recetas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {initialRecipes.filter((r) => r.is_ai_generated).length}
            </div>
            <div className="text-sm text-gray-600">Generadas por IA</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{categories.length}</div>
            <div className="text-sm text-gray-600">Categorías</div>
          </div>
        </div>
      </div>

      {/* Lista de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600">
            {hasActiveFilters
              ? "Intenta ajustar los filtros de búsqueda"
              : "No tienes recetas aún. ¡Añade tu primera receta!"}
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
