"use client"

import { useState, useMemo, useEffect, useTransition, useDeferredValue, memo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"
import Link from "next/link"
import { RecipeCard as RawRecipeCard } from "@/components/recipe-card"
import { SimpleNavigation } from "@/components/simple-navigation"
import { useAuth } from "@/components/auth/auth-provider"

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

// Memo del RecipeCard para evitar re-renders masivos durante la escritura
const RecipeCard = memo(RawRecipeCard)
RecipeCard.displayName = 'RecipeCardMemo'

export function RecipesPageClient({ initialRecipes, initialCategories, userProfiles = [] }: RecipesPageClientProps) {
  // Asegurar que siempre tengamos arrays válidos
  const recipes = Array.isArray(initialRecipes) ? initialRecipes : []
  const categories = Array.isArray(initialCategories) ? initialCategories : []

  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("") // término realmente usado para filtrar
  const [inputValue, setInputValue] = useState("") // texto que el usuario escribe instantáneamente
  const [isPending, startTransition] = useTransition()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all")
  const [iaOnly, setIaOnly] = useState(false)

  // Solo admins pueden ver el selector de usuario
  const isAdmin = profile && profile.role === "admin";

  // Obtener usuarios únicos con recetas
  const usersWithRecipes = useMemo(() => {
    const map = new Map();
    recipes.forEach((r) => {
      if (r.user_profiles && r.user_profiles.id) {
        map.set(r.user_profiles.id, r.user_profiles);
      }
    });
    return Array.from(map.values());
  }, [recipes]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Diferir el valor de búsqueda para que React renderice antes el input
  const deferredSearch = useDeferredValue(searchTerm)

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        !deferredSearch ||
        (recipe.name && recipe.name.toLowerCase().includes(deferredSearch.toLowerCase())) ||
        (recipe.ingredients && recipe.ingredients.toLowerCase().includes(deferredSearch.toLowerCase())) ||
        (String(recipe.id) === deferredSearch.trim());

      const matchesCategory =
        !selectedCategory ||
        (recipe.recipe_categories &&
          recipe.recipe_categories.some((rc) => rc.categories.id.toString() === selectedCategory))

      const matchesOwner =
        ownerFilter === "all" || (user && recipe.user_id === user.id)

      const matchesIa = !iaOnly || recipe.is_ai_generated

      const matchesUser = !selectedUserId || (recipe.user_profiles && recipe.user_profiles.id === selectedUserId);

      return matchesSearch && matchesCategory && matchesOwner && matchesIa && matchesUser
    })
  }, [recipes, deferredSearch, selectedCategory, ownerFilter, iaOnly, user, selectedUserId])

  // Debounce: actualizar searchTerm (el que filtra) solo después de que el usuario pare de teclear 250ms
  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(() => {
        setSearchTerm(inputValue)
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [inputValue])

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory(null)
    setOwnerFilter("all")
    setIaOnly(false)
    setSelectedUserId(null)
  }

  const hasActiveFilters = searchTerm || selectedCategory || ownerFilter !== "all" || iaOnly || selectedUserId

  if (recipes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
            <Link
              href="/recipes/add"
              className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 text-decoration-none"
              style={{ textDecoration: "none", backgroundColor: "#2563eb !important", color: "white !important" }}
            >
              Añadir Receta
            </Link>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recetas disponibles</h3>
                <p className="text-gray-600 mb-6">Comienza añadiendo tu primera receta para ver el contenido aquí.</p>
                <Link
                  href="/recipes/add"
                  className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 text-decoration-none"
                  style={{ textDecoration: "none", backgroundColor: "#2563eb !important", color: "white !important" }}
                >
                  Añadir Primera Receta
                </Link>
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
          <Link
            href="/recipes/add"
            className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 text-decoration-none"
            style={{ textDecoration: "none", backgroundColor: "#2563eb !important", color: "white !important" }}
          >
            Añadir Receta
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative" style={{ minWidth: 220, maxWidth: 320, flex: '0 0 220px' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar recetas..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-10 pr-2 text-sm h-9"
                style={{ width: 220 }}
              />
              {isPending && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">Filtrando...</div>
              )}
            </div>
            {/* Opciones de filtro: Todas / Las mías */}
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="ownerFilter"
                  value="all"
                  checked={ownerFilter === "all"}
                  onChange={() => setOwnerFilter("all")}
                  className="accent-blue-600"
                />
                Todas
              </label>
              <label className="flex items-center gap-1 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="ownerFilter"
                  value="mine"
                  checked={ownerFilter === "mine"}
                  onChange={() => setOwnerFilter("mine")}
                  className="accent-blue-600"
                />
                Las mías
              </label>
            </div>
            {/* Selector de usuario solo para admin, en la misma línea */}
            {isAdmin && usersWithRecipes.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Usuario:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedUserId || ""}
                  onChange={e => setSelectedUserId(e.target.value || null)}
                >
                  <option value="">Todos</option>
                  {usersWithRecipes.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.alias || u.full_name || u.email || u.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Checkbox IA */}
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={iaOnly}
                onChange={() => setIaOnly(v => !v)}
                className="accent-purple-600"
              />
              IA
            </label>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Ver categorías
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
                  <Link
                    href="/recipes/add"
                    className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200 text-decoration-none"
                    style={{ textDecoration: "none", backgroundColor: "#2563eb !important", color: "white !important" }}
                  >
                    Añadir Receta
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
