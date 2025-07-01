"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Filter, X } from "lucide-react"
import Link from "next/link"
import { RecipeCard } from "@/components/recipe-card"

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
    setShowMyRecipes(false)
  }

  const hasActiveFilters = searchTerm !== "" || selectedCategories.length > 0 || showMyRecipes

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Recetas</h1>
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

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas, ingredientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-medium mb-2">Categorías</h3>
            <div className="flex flex-wrap gap-2">
              {initialCategories.map((category) => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => toggleCategory(category.id)}
                >
                  {category.name} ({categoryCounts[category.id] || 0})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-semibold mb-2">No se encontraron recetas</h2>
          <p className="text-gray-600 mb-4">
            {hasActiveFilters
              ? "Intenta ajustar los filtros o buscar con otros términos"
              : "Aún no tienes recetas. ¡Añade tu primera receta!"}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters}>Limpiar filtros</Button>
          ) : (
            <Button asChild>
              <Link href="/recipes/add">
                <Plus className="mr-2 h-4 w-4" />
                Añadir primera receta
              </Link>
            </Button>
          )}
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
