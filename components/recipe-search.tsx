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

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])

  // Inicializar solo una vez al montar el componente
  useEffect(() => {
    const categoriesParam = searchParams.get("categories")
    const searchParam = searchParams.get("search")

    const urlCategories = categoriesParam
      ? categoriesParam
          .split(",")
          .map((id) => Number.parseInt(id.trim()))
          .filter((id) => !isNaN(id))
      : []

    // Siempre sincronizar con la URL, incluso si ya está inicializado
    setSelectedCategories(urlCategories)
    setSearchTerm(searchParam || "")

    if (!isInitializedRef.current) {
      isInitializedRef.current = true
    }
  }, [searchParams])

  // Añadir este nuevo useEffect después del existente:
  useEffect(() => {
    // Si no hay filtros activos pero la URL tiene parámetros, limpiar la URL
    if (isInitializedRef.current && selectedCategories.length === 0 && !searchTerm) {
      const hasParams = searchParams.get("categories") || searchParams.get("search")
      if (hasParams) {
        router.replace("/recipes")
      }
    }
  }, [selectedCategories, searchTerm, searchParams, router])

  // Función para aplicar filtros
  const applyFilters = useCallback(
    (search: string, categories: number[]) => {
      try {
        const params = new URLSearchParams()

        if (search.trim()) {
          params.set("search", search.trim())
        }

        if (categories.length > 0) {
          params.set("categories", categories.join(","))
        }

        // Si no hay parámetros, navegar a la ruta base sin query params
        const queryString = params.toString()
        const newUrl = `/recipes${queryString ? `?${queryString}` : ""}`
        router.push(newUrl)
      } catch (error) {
        console.error("Error applying filters:", error)
        // En caso de error, ir a la página limpia
        router.push("/recipes")
      }
    },
    [router],
  )

  // Aplicar filtros automáticamente cuando cambian las categorías
  useEffect(() => {
    if (isInitializedRef.current) {
      applyFilters(searchTerm, selectedCategories)
    }
  }, [selectedCategories, applyFilters, searchTerm])

  // Aplicar filtros con debounce para la búsqueda de texto
  useEffect(() => {
    if (isInitializedRef.current) {
      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Aplicar filtros después de 500ms de inactividad
      searchTimeoutRef.current = setTimeout(() => {
        applyFilters(searchTerm, selectedCategories)
      }, 500)

      // Cleanup
      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
      }
    }
  }, [searchTerm, applyFilters, selectedCategories])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    let newSelectedCategories: number[]
    if (checked) {
      newSelectedCategories = [...selectedCategories, categoryId]
    } else {
      newSelectedCategories = selectedCategories.filter((id) => id !== categoryId)
    }

    // Actualizar el estado inmediatamente
    setSelectedCategories(newSelectedCategories)

    // Aplicar filtros inmediatamente sin esperar al useEffect
    applyFilters(searchTerm, newSelectedCategories)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    router.push("/recipes")
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
