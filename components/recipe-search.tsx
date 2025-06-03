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
  const isInitializedRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const isUpdatingUrlRef = useRef(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  // Función para aplicar filtros sin causar bucles
  const updateUrl = useCallback(
    (search: string, categories: number[]) => {
      if (isUpdatingUrlRef.current) return

      try {
        isUpdatingUrlRef.current = true
        const params = new URLSearchParams()

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (categories.length > 0) {
          params.set("categories", categories.join(","))
        }

        const queryString = params.toString()
        const newUrl = `/recipes${queryString ? `?${queryString}` : ""}`

        // Usar replace para evitar entradas innecesarias en el historial
        router.replace(newUrl)
      } catch (error) {
        console.error("Error updating URL:", error)
        router.replace("/recipes")
      } finally {
        // Resetear la bandera después de un pequeño delay
        setTimeout(() => {
          isUpdatingUrlRef.current = false
        }, 100)
      }
    },
    [router],
  )

  // Inicializar desde URL solo una vez
  useEffect(() => {
    if (!isInitializedRef.current) {
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
      isInitializedRef.current = true
    }
  }, []) // Solo ejecutar una vez al montar

  // Manejar cambios en searchParams (navegación externa)
  useEffect(() => {
    if (isInitializedRef.current && !isUpdatingUrlRef.current) {
      const categoriesParam = searchParams.get("categories")
      const searchParam = searchParams.get("search")

      const urlCategories = categoriesParam
        ? categoriesParam
            .split(",")
            .map((id) => Number.parseInt(id.trim()))
            .filter((id) => !isNaN(id))
        : []

      // Solo actualizar si hay diferencias
      const currentCategoriesStr = selectedCategories.sort().join(",")
      const urlCategoriesStr = urlCategories.sort().join(",")

      if (currentCategoriesStr !== urlCategoriesStr || searchTerm !== (searchParam || "")) {
        setSelectedCategories(urlCategories)
        setSearchTerm(searchParam || "")
      }
    }
  }, [searchParams, selectedCategories, searchTerm])

  // Aplicar filtros con debounce para la búsqueda de texto
  useEffect(() => {
    if (isInitializedRef.current && !isUpdatingUrlRef.current) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        updateUrl(searchTerm, selectedCategories)
      }, 500)

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [searchTerm, updateUrl, selectedCategories])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    let newSelectedCategories: number[]
    if (checked) {
      newSelectedCategories = [...selectedCategories, categoryId]
    } else {
      newSelectedCategories = selectedCategories.filter((id) => id !== categoryId)
    }

    setSelectedCategories(newSelectedCategories)

    // Actualizar URL inmediatamente para cambios de categoría
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    updateUrl(searchTerm, newSelectedCategories)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    // El useEffect con debounce se encargará de actualizar la URL
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    updateUrl("", [])
  }

  const resetPage = () => {
    window.location.href = "/recipes"
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre o ingrediente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {(searchTerm || selectedCategories.length > 0) && (
          <Button type="button" variant="outline" onClick={clearFilters}>
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
      {(searchTerm || selectedCategories.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center">
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
