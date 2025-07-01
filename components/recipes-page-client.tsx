"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

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
  categories?: {
    id: number
    name: string
  }[]
}

interface Category {
  id: number
  name: string
  recipeCount: number
}

interface RecipesPageClientProps {
  initialRecipes: Recipe[]
  categories: Category[]
}

export default function RecipesPageClient({ initialRecipes, categories }: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [showMyRecipes, setShowMyRecipes] = useState(false)

  const filteredRecipes = useMemo(() => {
    let filtered = initialRecipes

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter((recipe) => recipe.categories?.some((cat) => cat.id === selectedCategory))
    }

    return filtered
  }, [initialRecipes, searchTerm, selectedCategory])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory(null)
    setShowMyRecipes(false)
  }

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
            <li>• Tus 82 recetas reales</li>
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
            placeholder="Buscar recetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.recipeCount})
              </option>
            ))}
          </select>

          {(searchTerm || selectedCategory) && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="text-sm text-gray-600 mb-4">
        Mostrando {filteredRecipes.length} de {initialRecipes.length} recetas
      </div>

      {/* Grid de recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{recipe.name}</CardTitle>
                {recipe.is_ai_generated && <Badge variant="secondary">AI</Badge>}
              </div>
              {recipe.user_profiles && (
                <p className="text-sm text-gray-600">
                  Por {recipe.user_profiles.full_name || recipe.user_profiles.first_name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {recipe.image_url && (
                <img
                  src={recipe.image_url || "/placeholder.svg"}
                  alt={recipe.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{recipe.ingredients}</p>
              {recipe.calories && <div className="text-sm text-gray-500 mb-2">{recipe.calories} calorías</div>}
              {recipe.categories && recipe.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {recipe.categories.map((category) => (
                    <Badge key={category.id} variant="outline" className="text-xs">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  Ver Receta
                </Button>
                {recipe.video_url && (
                  <Button size="sm" variant="outline">
                    Video
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && initialRecipes.length > 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600 mb-4">Intenta ajustar tus filtros de búsqueda</p>
          <Button onClick={clearFilters} variant="outline">
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
