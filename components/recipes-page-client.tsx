"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" ||
        recipe.recipe_categories?.some((rc) => rc.categories.id.toString() === selectedCategory)

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchTerm, selectedCategory])

  if (initialRecipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Entorno de desarrollo v0</h3>
          <p className="text-yellow-700">
            En producción, aquí verás tus {initialRecipes.length || 82} recetas reales de Supabase.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">No hay recetas disponibles</h2>
          <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
          <a
            href="/recipes/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-block"
          >
            Añadir Primera Receta
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Buscar recetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="sm:w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
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
                <CardTitle className="text-lg line-clamp-2">{recipe.name}</CardTitle>
                {recipe.is_ai_generated && (
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    IA
                  </Badge>
                )}
              </div>
              {recipe.user_profiles && (
                <p className="text-sm text-gray-600">
                  Por {recipe.user_profiles.first_name || recipe.user_profiles.full_name}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {recipe.image_url && (
                <img
                  src={recipe.image_url || "/placeholder.svg"}
                  alt={recipe.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              <p className="text-sm text-gray-700 line-clamp-3 mb-4">{recipe.ingredients.substring(0, 150)}...</p>

              {recipe.calories && <div className="text-sm text-gray-600 mb-3">🔥 {recipe.calories} calorías</div>}

              {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {recipe.recipe_categories.map((rc, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {rc.categories.name}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <a href={`/recipes/${recipe.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                  Ver receta →
                </a>
                {recipe.video_url && (
                  <Badge variant="outline" className="text-xs">
                    📹 Video
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-gray-600">Intenta con otros términos de búsqueda o cambia los filtros.</p>
        </div>
      )}
    </div>
  )
}
