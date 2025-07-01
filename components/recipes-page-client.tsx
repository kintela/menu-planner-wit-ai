"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, Play, ExternalLink, Clock, Users } from "lucide-react"

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showMyRecipes, setShowMyRecipes] = useState(false)

  const filteredRecipes = useMemo(() => {
    let filtered = initialRecipes

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.preparation.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar por categoría
    if (selectedCategory !== "all") {
      filtered = filtered.filter((recipe) =>
        recipe.recipe_categories?.some((rc) => rc.categories.id.toString() === selectedCategory),
      )
    }

    return filtered
  }, [initialRecipes, searchTerm, selectedCategory])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("all")
    setShowMyRecipes(false)
  }

  const hasActiveFilters = searchTerm || selectedCategory !== "all" || showMyRecipes

  if (initialRecipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-2xl font-semibold mb-2">No hay recetas disponibles</h2>
        <p className="text-gray-600 mb-6">
          En el entorno v0, las recetas se cargarán desde tu base de datos Supabase cuando despliegues la aplicación.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <h3 className="font-semibold text-blue-800 mb-2">🚀 En producción verás:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Tus recetas reales de Supabase</li>
            <li>• Filtros por categoría</li>
            <li>• Búsqueda completa</li>
            <li>• Información de autores</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar recetas por nombre, ingredientes o preparación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Mostrando {filteredRecipes.length} de {initialRecipes.length} recetas
        </span>
        {hasActiveFilters && <span className="text-blue-600">Filtros activos</span>}
      </div>

      {/* Grid de recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg leading-tight">{recipe.name}</CardTitle>
                <div className="flex gap-1 shrink-0">
                  {recipe.is_ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      AI
                    </Badge>
                  )}
                </div>
              </div>
              {recipe.user_profiles && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="h-3 w-3" />
                  <span>Por {recipe.user_profiles.first_name || recipe.user_profiles.full_name}</span>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {recipe.image_url && (
                <div className="relative">
                  <img
                    src={recipe.image_url || "/placeholder.svg"}
                    alt={recipe.name}
                    className="w-full h-48 object-cover rounded-md"
                  />
                  {recipe.video_url && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        Video
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-gray-600 line-clamp-2">
                  <strong>Ingredientes:</strong> {recipe.ingredients}
                </p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  <strong>Preparación:</strong> {recipe.preparation}
                </p>
              </div>

              {recipe.calories && (
                <div className="flex items-center gap-1 text-sm text-orange-600">
                  <Clock className="h-3 w-3" />
                  <span>{recipe.calories} calorías</span>
                </div>
              )}

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
                  Ver Receta
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

      {filteredRecipes.length === 0 && initialRecipes.length > 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600 mb-4">No hay recetas que coincidan con tus filtros de búsqueda</p>
          <Button onClick={clearFilters} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
