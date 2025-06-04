"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface RecipesClientFilterProps {
  children: React.ReactNode
  totalCount: number
}

export function RecipesClientFilter({ children, totalCount }: RecipesClientFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filteredCount, setFilteredCount] = useState(totalCount)

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    console.log("🧹 Limpiando todos los filtros...")

    // Limpiar el campo de búsqueda físicamente
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
    if (searchInput) {
      searchInput.value = ""
      searchInput.dispatchEvent(new Event("input", { bubbles: true }))
    }

    // Desmarcar todos los checkboxes físicamente
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((checkbox) => {
      if (checkbox instanceof HTMLInputElement && checkbox.checked) {
        checkbox.checked = false
        checkbox.dispatchEvent(new Event("change", { bubbles: true }))
      }
    })

    // Limpiar la función global si existe
    if (typeof window !== "undefined" && window.clearRecipeFilters) {
      window.clearRecipeFilters()
    }

    // Navegar a /recipes limpio
    router.replace("/recipes")

    // Forzar recarga como último recurso
    setTimeout(() => {
      if (window.location.pathname !== "/recipes" || window.location.search) {
        window.location.href = "/recipes"
      }
    }, 500)

    console.log("✅ Limpieza completada")
  }

  // Verificar si hay filtros activos
  const hasActiveFilters = searchParams.get("search") || searchParams.get("categories")

  return (
    <div className="space-y-4">
      {children}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Mostrando {filteredCount} recetas</div>

        {hasActiveFilters && (
          <Button
            type="button"
            onClick={clearAllFilters}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm rounded-md shadow-md transition-colors flex items-center gap-1"
            data-testid="clear-all-filters-button"
          >
            <X className="h-3 w-3" />
            Limpiar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
