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

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [isClearing, setIsClearing] = useState(false)

  // Inicializar desde URL
  useEffect(() => {
    if (!isClearing) {
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
    }
  }, [searchParams, isClearing])

  // Función para aplicar filtros
  const applyFilters = useCallback(
    (search: string, categories: number[]) => {
      if (isClearing) return

      try {
        if (!search && categories.length === 0) {
          router.replace("/recipes")
          return
        }

        const params = new URLSearchParams()

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (categories.length > 0) {
          params.set("categories", categories.join(","))
        }

        const queryString = params.toString()
        const newUrl = `/recipes${queryString ? `?${queryString}` : ""}`
        router.replace(newUrl)
      } catch (error) {
        console.error("Error applying filters:", error)
        router.replace("/recipes")
      }
    },
    [router, isClearing],
  )

  // Aplicar filtros con debounce
  useEffect(() => {
    if (!isClearing) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        applyFilters(searchTerm, selectedCategories)
      }, 300)

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [searchTerm, selectedCategories, applyFilters, isClearing])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (isClearing) return

    let newSelectedCategories: number[]
    if (checked) {
      newSelectedCategories = [...selectedCategories, categoryId]
    } else {
      newSelectedCategories = selectedCategories.filter((id) => id !== categoryId)
    }

    setSelectedCategories(newSelectedCategories)
  }

  const handleSearchChange = (value: string) => {
    if (isClearing) return
    setSearchTerm(value)
  }

  const clearFilters = async () => {
    setIsClearing(true)

    // Limpiar timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Limpiar el input directamente
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

    // Limpiar estado
    setSearchTerm("")
    setSelectedCategories([])

    // Navegar inmediatamente
    router.replace("/recipes")

    // Esperar un poco y volver a limpiar para asegurar
    setTimeout(() => {
      setSearchTerm("")
      setSelectedCategories([])
      if (searchInputRef.current) {
        searchInputRef.current.value = ""
      }
      router.replace("/recipes")
    }, 100)

    // Finalizar el proceso de limpieza
    setTimeout(() => {
      setIsClearing(false)
    }, 200)
  }

  const resetPage = () => {
    // Solución de emergencia: recargar completamente
    window.location.href = "/recipes"
  }

  // Verificar si hay filtros activos
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
            disabled={isClearing}
            data-testid="clear-filters-button"
          >
            <X className="mr-2 h-4 w-4" />
            {isClearing ? "Limpiando..." : "Limpiar"}
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
                  disabled={isClearing}
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
      {hasActiveFilters && !isClearing && (
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
