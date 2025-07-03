"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Filter, X } from "lucide-react"
import Link from "next/link"
import { RecipeCard } from "@/components/recipe-card"

interface Recipe {
  id: string
  title: string
  description?: string
  ingredients?: string[]
  instructions?: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: string
  category_id?: string
  image_url?: string
  video_url?: string
  source_url?: string
  rating?: number
  created_at: string
  user_id: string
}

interface Category {
  id: string
  name: string
  description?: string
}

interface RecipesPageClientProps {
  initialRecipes: Recipe[]
  initialCategories: Category[]
}

export function RecipesPageClient({ initialRecipes = [], initialCategories = [] }: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filteredRecipes = useMemo(() => {
    if (!Array.isArray(initialRecipes)) return []

    return initialRecipes.filter((recipe) => {
      const matchesSearch =
        !searchTerm ||
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = !selectedCategory || recipe.category_id === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchTerm, selectedCategory])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory(null)
  }

  const hasActiveFilters = searchTerm || selectedCategory

  if (!Array.isArray(initialRecipes) || initialRecipes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
          <Button asChild>
            <Link href="/recipes/add">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Receta
            </Link>
          </Button>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recetas disponibles</h3>
              <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
              <Button asChild>
                <Link href="/recipes/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Primera Receta
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
        <Button asChild>
          <Link href="/recipes/add">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Receta
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>

        {showFilters && (
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Todas
                  </Button>
                  {initialCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-gray-600">
          {filteredRecipes.length} receta{filteredRecipes.length !== 1 ? "s" : ""} encontrada
          {filteredRecipes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron recetas</h3>
              <p className="text-gray-600 mb-6">Intenta ajustar tus filtros de búsqueda o añade una nueva receta.</p>
              <div className="flex gap-4 justify-center">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )}
                <Button asChild>
                  <Link href="/recipes/add">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Receta
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
