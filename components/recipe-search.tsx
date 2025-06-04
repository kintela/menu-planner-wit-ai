"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface RecipeSearchProps {
  onSearch: (searchText: string, selectedCategories: string[]) => void
  categories: string[]
  onClearFilters: () => void
}

export function RecipeSearch({ categories, onClearFilters }: RecipeSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const router = useRouter()
  const [key, setKey] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasActiveFilters = searchTerm !== "" || selectedCategories.length > 0

  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value
    setSearchTerm(newSearchTerm)
    // onSearch(event.target.value, selectedCategories)
  }

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const category = event.target.value
    if (event.target.checked) {
      setSelectedCategories([...selectedCategories, category])
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
    // onSearch(searchText, selectedCategories)
  }

  const clearFilters = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Limpiar estados
    setSearchTerm("")
    setSelectedCategories([])
    setIsInitialized(false)

    // Limpiar el input físicamente
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }

    // Forzar re-render
    setKey((prev) => prev + 1)

    // Navegar a /recipes limpio
    router.replace("/recipes")

    // Reinicializar después de un momento
    setTimeout(() => {
      setIsInitialized(true)
    }, 100)
  }, [router])

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Search recipes..."
        value={searchTerm}
        onChange={handleSearchTextChange}
        className="w-full p-2 border rounded-md mb-4"
        ref={searchInputRef}
      />

      <div className="mb-4">
        <p className="font-semibold">Categories:</p>
        {categories.map((category) => (
          <label key={category} className="block">
            <input
              type="checkbox"
              value={category}
              checked={selectedCategories.includes(category)}
              onChange={handleCategoryChange}
              className="mr-2"
            />
            {category}
          </label>
        ))}
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            onClick={clearFilters}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-md transition-colors"
            data-testid="clear-filters-button"
          >
            Limpiar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
