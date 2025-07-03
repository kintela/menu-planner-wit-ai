"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"
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
  initialRecipes?: Recipe[]
  initialCategories?: Category[]
  userProfiles?: any[]
}

export function RecipesPageClient({ initialRecipes, initialCategories, userProfiles = [] }: RecipesPageClientProps) {
  // Asegurar que siempre tengamos arrays válidos
  const recipes = Array.isArray(initialRecipes) ? initialRecipes : []
  const categories = Array.isArray(initialCategories) ? initialCategories : []

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        !searchTerm ||
        (recipe.name && recipe.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (recipe.ingredients && recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory =
        !selectedCategory ||
        (recipe.recipe_categories &&
          recipe.recipe_categories.some((rc) => rc.categories.id.toString() === selectedCategory))

      return matchesSearch && matchesCategory
    })
  }, [recipes, searchTerm, selectedCategory])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory(null)
  }

  const hasActiveFilters = searchTerm || selectedCategory

  if (recipes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
            <Button
              asChild
              className="font-medium px-6 py-2 rounded-md shadow-sm"
              style={{ backgroundColor: "#2563eb !important", color: "white !important", border: "none" }}
            >
              <Link href="/recipes/add" style={{ backgroundColor: "#2563eb", color: "white", textDecoration: "none" }}>
                Añadir Receta
              </Link>
            </Button>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recetas disponibles</h3>
                <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
                <Button
                  asChild
                  className="font-medium px-6 py-2 rounded-md shadow-sm"
                  style={{ backgroundColor: "#2563eb !important", color: "white !important", border: "none" }}
                >
                  <Link
                    href="/recipes/add"
                    style={{ backgroundColor: "#2563eb", color: "white", textDecoration: "none" }}
                  >
                    Añadir Primera Receta
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
            <p className="text-gray-600 mt-1">
              {filteredRecipes.length} de {recipes.length} recetas
            </p>
          </div>
          <Button
            asChild
            className="font-medium px-6 py-2 rounded-md shadow-sm"
            style={{ backgroundColor: "#2563eb !important", color: "white !important", border: "none" }}
          >
            <Link href="/recipes/add" style={{ backgroundColor: "#2563eb", color: "white", textDecoration: "none" }}>
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
                placeholder="Buscar recetas, ingredientes o preparación..."
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
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id.toString() ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id.toString())}
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

        {/* Recipe Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <Button
                    asChild
                    className="font-medium px-6 py-2 rounded-md shadow-sm"
                    style={{ backgroundColor: "#2563eb !important", color: "white !important", border: "none" }}
                  >
                    <Link
                      href="/recipes/add"
                      style={{ backgroundColor: "#2563eb", color: "white", textDecoration: "none" }}
                    >
                      Añadir Receta
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
