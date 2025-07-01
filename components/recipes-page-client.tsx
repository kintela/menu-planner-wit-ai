"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import Link from "next/link"
import { SimpleNavigation } from "@/components/simple-navigation"

interface RecipesPageClientProps {
  initialRecipes: any[]
}

export function RecipesPageClient({ initialRecipes }: RecipesPageClientProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [filteredRecipes, setFilteredRecipes] = useState(initialRecipes)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setRecipes(initialRecipes)
    setFilteredRecipes(initialRecipes)
  }, [initialRecipes])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredRecipes(recipes)
    } else {
      const filtered = recipes.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.preparation.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredRecipes(filtered)
    }
  }, [searchTerm, recipes])

  if (recipes.length === 0) {
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
              {filteredRecipes.length} de {recipes.length} recetas
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredRecipes.length === 0 && searchTerm ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No se encontraron recetas</h2>
            <p className="text-gray-600 mb-6">Intenta con otros términos de búsqueda.</p>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              Limpiar búsqueda
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url || "/placeholder.svg"}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">Sin imagen</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{recipe.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.ingredients.substring(0, 100)}...</p>
                  {recipe.calories && <div className="text-sm text-gray-500 mb-3">🔥 {recipe.calories} calorías</div>}
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Ver receta →
                    </Link>
                    {recipe.video_url && <span className="text-xs bg-gray-100 px-2 py-1 rounded">📹 Video</span>}
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
