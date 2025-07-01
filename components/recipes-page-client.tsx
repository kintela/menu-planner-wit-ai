"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Filter, X } from "lucide-react"
import Link from "next/link"
import { RecipeCard } from "@/components/recipe-card"
import { SimpleNavigation } from "@/components/simple-navigation"

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
    full_name?: string
    first_name?: string
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

export function RecipesPageClient({ initialRecipes, initialCategories }: RecipesPageClientProps) {
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
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    initialRecipes.forEach((recipe) => {
      recipe.recipe_categories?.forEach((rc) => {
        counts[rc.categories.id] = (counts[rc.categories.id] || 0) + 1
      })
    })
    return counts
  }, [initialRecipes])

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
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
            <p className="text-gray-600 mt-1">
              {filteredRecipes.length} de {initialRecipes.length} recetas
            </p>
          </div>
          <Button asChild>
            <Link href="/recipes/add">
              <Plus className="mr-2 h-4 w-4" />
              Añadir Receta
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar recetas, ingredientes o preparación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-blue-50 border-blue-200" : ""}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="pt-0">
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Categorías</h3>
                <div className="flex flex-wrap gap-2">
                  {initialCategories.map((category) => (
                    <Badge
                      key={category.id}
                      variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.name}
                      <span className="ml-1 text-xs">({categoryCounts[category.id] || 0})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Results */}
        {filteredRecipes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <CardTitle className="text-xl mb-2">No se encontraron recetas</CardTitle>
              <p className="text-gray-600 mb-4">
                {hasActiveFilters ? "Intenta ajustar los filtros de búsqueda" : "Comienza añadiendo tu primera receta"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/recipes/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Primera Receta
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
