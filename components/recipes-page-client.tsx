"use client"

import { useState, useMemo } from "react"
import { Search, Filter, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import RecipeCard from "@/components/recipe-card"
import Link from "next/link"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean | null
  video_url: string | null
  source_url: string | null
  calories: number | null
  created_at: string
  user_id: string | null
  category_id: number | null
}

interface Category {
  id: number
  name: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  alias: string | null
  avatar_url: string | null
}

interface RecipesPageClientProps {
  initialRecipes?: Recipe[]
  initialCategories?: Category[]
  userProfiles?: UserProfile[]
}

export default function RecipesPageClient({
  initialRecipes = [],
  initialCategories = [],
  userProfiles = [],
}: RecipesPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showMyRecipes, setShowMyRecipes] = useState(false)

  // Ensure we have valid arrays
  const recipes = Array.isArray(initialRecipes) ? initialRecipes : []
  const categories = Array.isArray(initialCategories) ? initialCategories : []

  const filteredRecipes = useMemo(() => {
    if (!Array.isArray(recipes)) return []

    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === "all" || recipe.category_id?.toString() === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [recipes, searchTerm, selectedCategory])

  const getUserProfile = (userId: string | null) => {
    if (!userId || !Array.isArray(userProfiles)) return null
    return userProfiles.find((profile) => profile.id === userId) || null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
        <Link href="/recipes/add">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Receta
          </Button>
        </Link>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar recetas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
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

      {/* Results */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {recipes.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No hay recetas disponibles</h3>
                <p>Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No se encontraron recetas</h3>
                <p>Intenta con otros términos de búsqueda o filtros.</p>
              </>
            )}
          </div>
          {recipes.length === 0 && (
            <Link href="/recipes/add">
              <Button className="bg-blue-600 hover:bg-blue-700">Añadir Primera Receta</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} userProfile={getUserProfile(recipe.user_id)} />
          ))}
        </div>
      )}
    </div>
  )
}
