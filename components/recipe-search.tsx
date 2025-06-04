"use client"


import { useState, useRef, useEffect } from "react"
import { Search, RefreshCw } from "lucide-react"


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

  // Sincronizar el input con el estado del padre
  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value !== searchTerm) {
      searchInputRef.current.value = searchTerm
    }
  }, [searchTerm])


  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId)

    onFiltersChange(searchTerm, newCategories)
  }

  const handleSearchChange = (value: string) => {
    onFiltersChange(value, selectedCategories)
  }

  // Función para limpiar filtros (solo estado local)
  const clearFilters = () => {
    console.log("🧹 Limpiando filtros desde RecipeSearch...")


    // Limpiar input de búsqueda físicamente
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

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
  }

  // Exponer la función de limpieza globalmente
  if (typeof window !== "undefined") {
    window.clearRecipeFilters = clearFilters
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
    </div>
  )
}
