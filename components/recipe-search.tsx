"use client"

import { useState, useEffect, useRef } from "react"
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
  const [forceUpdate, setForceUpdate] = useState(0)

  // Estados con valores por defecto
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Función para forzar re-render
  const forceRerender = () => setForceUpdate((prev) => prev + 1)

  // Inicializar desde URL
  useEffect(() => {
    if (!isInitialized) {
      const categoriesParam = searchParams.get("categories")
      const searchParam = searchParams.get("search")

      console.log("Inicializando desde URL:", { categoriesParam, searchParam })

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
  const updateURL = (search: string, categories: number[]) => {
    console.log("Actualizando URL:", { search, categories })

    if (!search && categories.length === 0) {
      console.log("Sin filtros, navegando a /recipes")
      router.replace("/recipes")
      return
    }

    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (categories.length > 0) params.set("categories", categories.join(","))

    const newUrl = `/recipes?${params.toString()}`
    console.log("Nueva URL:", newUrl)
    router.replace(newUrl)
  }

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
  }, [searchTerm, isInitialized])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    console.log("Cambio de categoría:", { categoryId, checked })

    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId)

    setSelectedCategories(newCategories)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    updateURL(searchTerm, newCategories)
    forceRerender()
  }

  const handleSearchChange = (value: string) => {
    console.log("Cambio de búsqueda:", value)
    setSearchTerm(value)
    forceRerender()
  }

  // NUEVA ESTRATEGIA: Limpieza radical con recarga forzada
  const clearFilters = () => {
    console.log("=== INICIANDO LIMPIEZA RADICAL ===")
    console.log("Estado antes:", { searchTerm, selectedCategories })

    // Método 1: Usar window.location directamente
    console.log("Método 1: window.location.href")
    window.location.href = "/recipes"
  }

  // Método alternativo: Limpieza paso a paso
  const clearFiltersStepByStep = () => {
    console.log("=== LIMPIEZA PASO A PASO ===")

    // Paso 1: Limpiar timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Paso 2: Limpiar input DOM
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

    // Paso 3: Limpiar estado React
    setSearchTerm("")
    setSelectedCategories([])

    // Paso 4: Forzar re-render
    forceRerender()

    // Paso 5: Navegar
    router.replace("/recipes")

    console.log("Estado después:", { searchTerm: "", selectedCategories: [] })
  }

  const resetPage = () => {
    console.log("Reset completo de página")
    window.location.href = "/recipes"
  }

  const hasActiveFilters = searchTerm || selectedCategories.length > 0

  console.log("Render actual:", {
    searchTerm,
    selectedCategories,
    hasActiveFilters,
    isInitialized,
    forceUpdate,
  })

  return (
    <div className="space-y-4">
      {/* Debug info visible */}
      <div className="text-xs bg-yellow-100 p-2 rounded border">
        <strong>DEBUG:</strong> searchTerm="{searchTerm}" | categories=[{selectedCategories.join(",")}] |
        hasActiveFilters={hasActiveFilters.toString()} | URL=
        {typeof window !== "undefined" ? window.location.href : "N/A"}
      </div>

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

        {/* Botón Limpiar SIEMPRE visible para debug */}
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          data-testid="clear-filters-button"
          className="bg-red-100 hover:bg-red-200 border-red-300 text-red-700"
        >
          <X className="mr-2 h-4 w-4" />
          Limpiar (Método 1)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={clearFiltersStepByStep}
          data-testid="clear-filters-step-button"
          className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700"
        >
          <X className="mr-2 h-4 w-4" />
          Limpiar (Método 2)
        </Button>

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
        <div className="flex flex-wrap gap-2 items-center bg-orange-100 p-2 rounded" data-testid="active-filters">
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
    </div>
  )
}
