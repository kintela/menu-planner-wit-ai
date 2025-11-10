"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// Declaración global para la función de limpieza expuesta
declare global {
  interface Window { clearRecipeFilters?: () => void }
}
import { Search, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

interface RecipeSearchProps {
  categories: CategoryWithCount[]
  searchTerm: string
  selectedCategories: number[]
  onFiltersChange: (searchTerm: string, selectedCategories: number[]) => void
  onClearFilters: () => void
}

export function RecipeSearch({
  categories,
  searchTerm,
  selectedCategories,
  onFiltersChange,
  onClearFilters,
}: RecipeSearchProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [key, setKey] = useState(0)
  // Estado local para que las teclas aparezcan instantáneamente aunque el padre tarde en recalcular filtros
  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Mantener sincronizado si el padre limpia / cambia externamente el término
  useEffect(() => {
    if (searchTerm !== localSearch) {
      setLocalSearch(searchTerm)
    }
  }, [searchTerm, localSearch])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId)

    onFiltersChange(searchTerm, newCategories)
  }

  const handleSearchChange = (value: string) => {
    // Solo actualiza texto local, sin disparar filtro aún
    setLocalSearch(value)
  }

  const executeSearch = () => {
    onFiltersChange(localSearch, selectedCategories)
  }

  // Función para limpiar filtros (solo estado local)
  const clearFilters = useCallback(() => {
    console.log("🧹 Limpiando filtros desde RecipeSearch...")

    // Limpiar input de búsqueda físicamente
    setLocalSearch("")

    // Limpiar todos los inputs de búsqueda
    const searchInputs = document.querySelectorAll('input[type="search"]')
    searchInputs.forEach((input) => {
      if (input instanceof HTMLInputElement) {
        input.value = ""
      }
    })

    // Limpiar checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement && checkbox.checked) {
        checkbox.checked = false
      }
    })

    // Forzar re-render
    setKey((prev) => prev + 1)

    // Notificar al componente padre
    onFiltersChange("", [])
    onClearFilters()

    console.log("✅ Filtros limpiados desde RecipeSearch")
  }, [onClearFilters, onFiltersChange])

  // Exponer la función de limpieza globalmente
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }
    window.clearRecipeFilters = clearFilters
    return () => {
      if (window.clearRecipeFilters === clearFilters) {
        delete window.clearRecipeFilters
      }
    }
  }, [clearFilters])

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
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                executeSearch()
              }
            }}
            data-testid="search-input"
          />
        </div>
        <Button type="button" onClick={executeSearch} variant="default" title="Buscar" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()} title="Recargar página">
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
                <span className="cursor-pointer flex items-center">
                  {category.name}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {category.recipeCount}
                  </Badge>
                </span>
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
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-sm">
              Búsqueda: &ldquo;{searchTerm}&rdquo;
            </span>
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
