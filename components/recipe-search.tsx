"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X, RefreshCw } from "lucide-react"

import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface CategoryWithCount extends Category {
  recipeCount: number
}

interface RecipeSearchProps {
  categories: CategoryWithCount[]
}

export function RecipeSearch({ categories }: RecipeSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const [key, setKey] = useState(0)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Inicializar desde URL
  useEffect(() => {
    if (!isInitialized) {
      const categoriesParam = searchParams.get("categories")
      const searchParam = searchParams.get("search")

      const urlCategories = categoriesParam
        ? categoriesParam
            .split(",")
            .map((id) => Number.parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : []

      setSelectedCategories(urlCategories)
      setSearchTerm(searchParam || "")
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized])

  // Función para actualizar URL
  const updateURL = useCallback(
    (search: string, categories: number[]) => {
      if (!search && categories.length === 0) {
        router.replace("/recipes")
        return
      }

      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (categories.length > 0) params.set("categories", categories.join(","))

      router.replace(`/recipes?${params.toString()}`)
    },
    [router],
  )

  // Manejar cambios en búsqueda
  useEffect(() => {
    if (isInitialized) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        updateURL(searchTerm, selectedCategories)
      }, 300)

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [searchTerm, isInitialized, updateURL, selectedCategories])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId)

    setSelectedCategories(newCategories)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    updateURL(searchTerm, newCategories)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  // Función de limpieza
  const clearFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setSearchTerm("")
    setSelectedCategories([])
    setIsInitialized(false)

    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

    setKey((prev) => prev + 1)
    router.replace("/recipes")

    setTimeout(() => {
      setIsInitialized(true)
    }, 100)
  }

  const resetPage = () => {
    try {
      window.location.href = "/recipes"
    } catch {
      try {
        window.location.replace("/recipes")
      } catch {
        router.push("/recipes")
      }
    }
  }

  const hasActiveFilters = searchTerm || selectedCategories.length > 0

  return (
    <div key={key} className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Buscar por nombre o ingrediente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="search-input"
          />
        </div>

        <Button type="button" variant="outline" onClick={resetPage} title="Recargar página">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Filtrar por categoría:</h3>
        <div className="flex flex-wrap gap-4">
          {categories && categories.length > 0 ? (
            categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                  data-testid={`category-checkbox-${category.id}`}
                />
                <Label htmlFor={`category-${category.id}`} className="cursor-pointer flex items-center">
                  {category.name}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {category.recipeCount}
                  </Badge>
                </Label>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No hay categorías disponibles.</p>
          )}
        </div>
      </div>

      {/* Mostrar filtros activos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center" data-testid="active-filters">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {searchTerm && (
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">Búsqueda: "{searchTerm}"</span>
          )}
          {selectedCategories.map((categoryId) => {
            const category = categories.find((cat) => cat.id === categoryId)
            return category ? (
              <span key={categoryId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                {category.name}
              </span>
            ) : null
          })}
        </div>
      )}

      {/* Botón Limpiar - Solo visible cuando hay filtros activos */}
      {hasActiveFilters && (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={clearFilters}
            data-testid="clear-filters-button"
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
