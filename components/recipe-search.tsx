"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, RefreshCw, X } from "lucide-react"

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
  onClearFilters?: () => void
}

export function RecipeSearch({ categories, onClearFilters }: RecipeSearchProps) {
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

  // NUEVA FUNCIÓN DE LIMPIEZA MEJORADA
  const clearFilters = useCallback(() => {
    console.log("🧹 Iniciando limpieza de filtros...")

    // Limpiar timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Resetear todos los estados
    setSearchTerm("")
    setSelectedCategories([])
    setIsInitialized(false)

    // Limpiar el input físicamente
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

    // Limpiar todos los checkboxes físicamente
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement) {
        checkbox.checked = false
      }
    })

    // Forzar re-render
    setKey((prev) => prev + 1)

    // Navegar a /recipes limpio
    router.replace("/recipes")

    // Reinicializar después de un momento
    setTimeout(() => {
      setIsInitialized(true)
      console.log("✅ Limpieza completada")
    }, 100)
  }, [router])

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

      {/* BOTÓN LIMPIAR MEJORADO */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={clearFilters}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-md transition-colors flex items-center gap-2"
            data-testid="clear-filters-button"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      )}

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
