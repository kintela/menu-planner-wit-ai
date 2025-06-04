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
  const mountedRef = useRef(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  // Inicializar solo una vez al montar
  useEffect(() => {
    if (!mountedRef.current) {
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
      mountedRef.current = true
    }
  }, [searchParams])

  // Función para actualizar URL
  const updateURL = (search: string, categories: number[]) => {
    if (!search && categories.length === 0) {
      router.replace("/recipes")
      return
    }

    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (categories.length > 0) params.set("categories", categories.join(","))

    router.replace(`/recipes?${params.toString()}`)
  }

  // Manejar cambios en búsqueda con debounce
  useEffect(() => {
    if (mountedRef.current) {
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
  }, [searchTerm])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter((id) => id !== categoryId)

    setSelectedCategories(newCategories)

    // Actualizar URL inmediatamente para categorías
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    updateURL(searchTerm, newCategories)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    // Actualizar el input directamente también
    if (searchInputRef.current) {
      searchInputRef.current.value = value
    }
  }

  // SOLUCIÓN RADICAL: Función de limpieza que fuerza todo
  const clearFilters = () => {
    // 1. Limpiar timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 2. Limpiar input DOM directamente
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
      // Disparar evento change para asegurar sincronización
      const event = new Event("input", { bubbles: true })
      searchInputRef.current.dispatchEvent(event)
    }

    // 3. Limpiar estado React
    setSearchTerm("")
    setSelectedCategories([])

    // 4. Forzar navegación múltiple para asegurar
    router.replace("/recipes")

    // 5. Backup: usar setTimeout para forzar otra limpieza
    setTimeout(() => {
      setSearchTerm("")
      setSelectedCategories([])
      if (searchInputRef.current) {
        searchInputRef.current.value = ""
      }
      router.replace("/recipes")
    }, 50)

    // 6. Último recurso: recargar página si nada más funciona
    setTimeout(() => {
      if (window.location.pathname === "/recipes" && window.location.search) {
        window.location.href = "/recipes"
      }
    }, 500)
  }

  const resetPage = () => {
    window.location.href = "/recipes"
  }

  const hasActiveFilters = searchTerm || selectedCategories.length > 0

  return (
    <div className="space-y-4">
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
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            data-testid="clear-filters-button"
            className="bg-red-50 hover:bg-red-100 border-red-200"
          >
            <X className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        )}
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

      {/* Debug info - remover en producción */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
          Debug: searchTerm="{searchTerm}" | categories=[{selectedCategories.join(",")}] | URL={window.location.href}
        </div>
      )}
    </div>
  )
}
