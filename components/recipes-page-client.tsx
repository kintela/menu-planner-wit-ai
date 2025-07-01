"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, X, Play, ExternalLink, Sparkles, User } from "lucide-react"

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
  const [showMyRecipes, setShowMyRecipes] = useState(false)

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
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    categories.forEach((cat) => {
      counts[cat.id] = initialRecipes.filter((recipe) =>
        recipe.recipe_categories?.some((rc) => rc.categories.id === cat.id),
      ).length
    })
    return counts
  }, [initialRecipes, categories])

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    setShowMyRecipes(false)
  }

  const hasActiveFilters = searchTerm !== "" || selectedCategories.length > 0 || showMyRecipes

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
          className="pl-10 pr-4 py-2"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Categorías:</span>
        </div>

        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategories.includes(category.id) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleCategory(category.id)}
            className="text-xs"
          >
            {category.name}
            <Badge variant="secondary" className="ml-1 text-xs">
              {categoryCounts[category.id] || 0}
            </Badge>
          </Button>
        ))}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600 hover:text-red-700">
            <X className="h-4 w-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Estadísticas */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center text-sm">
          <span>
            Mostrando <strong>{filteredRecipes.length}</strong> de <strong>{initialRecipes.length}</strong> recetas
          </span>
          {hasActiveFilters && (
            <span className="text-blue-600">
              {selectedCategories.length > 0 && `${selectedCategories.length} categorías seleccionadas`}
              {searchTerm && ` • Búsqueda: "${searchTerm}"`}
            </span>
          )}
        </div>
      </div>

      {/* Grid de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron recetas</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? "Intenta ajustar los filtros o términos de búsqueda"
              : "No hay recetas disponibles en este momento"}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={recipe.image_url || "/placeholder.svg?height=200&width=300&text=Receta"}
                  alt={recipe.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {recipe.is_ai_generated && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                  {recipe.calories && (
                    <Badge variant="outline" className="bg-white/90">
                      {recipe.calories} cal
                    </Badge>
                  )}
                </div>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{recipe.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-3 w-3" />
                  <span>{recipe.user_profiles?.full_name || "Usuario desconocido"}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Ingredientes:</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{recipe.ingredients}</p>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-1">Preparación:</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">{recipe.preparation}</p>
                </div>

                {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.recipe_categories.map((rc, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {rc.categories.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    Ver receta
                  </Button>
                  {recipe.video_url && (
                    <Button size="sm" variant="outline">
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  {recipe.source_url && (
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
