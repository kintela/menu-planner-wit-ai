"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
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

export function RecipesPageClient({ initialRecipes = [], initialCategories = [] }: RecipesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecipes = useMemo(() => {
    if (!initialRecipes || !Array.isArray(initialRecipes)) {
      return []
    }

    return initialRecipes.filter((recipe) => {
      if (!recipe) return false

      const matchesSearch =
        !searchQuery ||
        (recipe.name && recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (recipe.ingredients && recipe.ingredients.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchesSearch
    })
  }, [initialRecipes, searchQuery])

  if (!initialRecipes || initialRecipes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Recetas</h1>
            <Button asChild>
              <Link href="/recipes/add">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Receta
              </Link>
            </Button>
          </div>

          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No hay recetas disponibles</h2>
            <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
            <Button asChild>
              <Link href="/recipes/add">Añadir Primera Receta</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Recetas</h1>
            <p className="text-gray-600 mt-1">
              {filteredRecipes.length} de {initialRecipes.length} recetas
            </p>
          </div>
          <Button asChild>
            <Link href="/recipes/add">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Receta
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar recetas, ingredientes o preparación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredRecipes.length === 0 && searchQuery ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No se encontraron recetas</h2>
            <p className="text-gray-600 mb-6">Intenta con otros términos de búsqueda.</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-video bg-gray-200 flex items-center justify-center relative">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url || "/placeholder.svg"}
                      alt={recipe.name || "Receta"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">Sin imagen</span>
                  )}
                  {recipe.video_url && (
                    <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      📹 Video
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{recipe.name || "Sin título"}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {recipe.ingredients ? recipe.ingredients.substring(0, 100) + "..." : "Sin ingredientes"}
                  </p>
                  {recipe.calories && <div className="text-sm text-gray-500 mb-3">🔥 {recipe.calories} calorías</div>}
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Ver receta →
                    </Link>
                    {recipe.is_ai_generated && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">🤖 IA</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
