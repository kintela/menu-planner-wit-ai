"use client"

import { useState, useEffect } from "react"
import { RecipeCard } from "@/components/recipe-card"
import { RecipeSearch } from "@/components/recipe-search"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

interface RecipesPageClientProps {
  initialRecipes: any[]
}

export function RecipesPageClient({ initialRecipes }: RecipesPageClientProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [filteredRecipes, setFilteredRecipes] = useState(initialRecipes)

  useEffect(() => {
    setRecipes(initialRecipes)
    setFilteredRecipes(initialRecipes)
  }, [initialRecipes])

  const handleSearch = (searchResults: any[]) => {
    setFilteredRecipes(searchResults)
  }

  if (recipes.length === 0) {
    return (
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
    )
  }

  return (
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

      <div className="mb-8">
        <RecipeSearch recipes={recipes} onSearch={handleSearch} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}
