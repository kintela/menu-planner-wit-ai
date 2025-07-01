"use client"

import { useState, useMemo } from "react"
import { RecipeCard } from "./recipe-card"
import { RecipeSearch } from "./recipe-search"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

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

export function RecipesPageClient({ initialRecipes, initialCategories }: RecipesPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [myRecipesOnly, setMyRecipesOnly] = useState(false)

  const filteredRecipes = useMemo(() => {
    return initialRecipes.filter((recipe) => {
      const matchesSearch =
        !searchQuery ||
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        !selectedCategory || recipe.recipe_categories?.some((rc) => rc.categories.name === selectedCategory)

      return matchesSearch && matchesCategory
    })
  }, [initialRecipes, searchQuery, selectedCategory])

  if (initialRecipes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Recetas</h1>
          <Link href="/recipes/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Receta
            </Button>
          </Link>
        </div>

        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">No hay recetas disponibles</h2>
          <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
          <Link href="/recipes/add">
            <Button>Añadir Primera Receta</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Link href="/recipes/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Receta
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <RecipeSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={initialCategories}
          myRecipesOnly={myRecipesOnly}
          onMyRecipesChange={setMyRecipesOnly}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>

      {filteredRecipes.length === 0 && initialRecipes.length > 0 && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">No se encontraron recetas</h2>
          <p className="text-gray-600">Intenta ajustar los filtros de búsqueda.</p>
        </div>
      )}
    </div>
  )
}
