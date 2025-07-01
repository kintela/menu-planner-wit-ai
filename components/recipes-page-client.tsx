"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showMyRecipes, setShowMyRecipes] = useState(false)

  // Filtrar recetas
  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      // Filtro de búsqueda
      const matchesSearch =
        searchQuery === "" ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.preparation.toLowerCase().includes(searchQuery.toLowerCase())

      // Filtro de categoría
      const matchesCategory =
        selectedCategory === "all" || recipe.categories?.some((cat) => cat.id.toString() === selectedCategory)

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchQuery, selectedCategory])

  // Limpiar filtros
  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setShowMyRecipes(false)
  }

  // Contar recetas por categoría
  const categoriesWithCount = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: initialRecipes.filter((recipe) => recipe.categories?.some((cat) => cat.id === category.id)).length,
    }))
  }, [categories, initialRecipes])

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas, ingredientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por categoría */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categoriesWithCount.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name} ({category.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botón limpiar filtros */}
          {(searchQuery || selectedCategory !== "all") && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Filtros activos */}
        {(searchQuery || selectedCategory !== "all") && (
          <div className="flex flex-wrap gap-2">
            {searchQuery && <Badge variant="secondary">Búsqueda: "{searchQuery}"</Badge>}
            {selectedCategory !== "all" && (
              <Badge variant="secondary">
                Categoría: {categories.find((c) => c.id.toString() === selectedCategory)?.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          Mostrando {filteredRecipes.length} de {initialRecipes.length} recetas
        </p>
      </div>

      {/* Grid de recetas */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedCategory !== "all"
              ? "Intenta ajustar los filtros de búsqueda"
              : "No tienes recetas guardadas aún"}
          </p>
          {(searchQuery || selectedCategory !== "all") && <Button onClick={clearFilters}>Limpiar filtros</Button>}
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
