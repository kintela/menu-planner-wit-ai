"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RecipeSearchProps {
  onSearch: (searchText: string, selectedCategories: string[]) => void
  categories: string[]
}

const RecipeSearch: React.FC<RecipeSearchProps> = ({ onSearch, categories }) => {
  const [searchText, setSearchText] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const router = useRouter()

  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value)
    onSearch(event.target.value, selectedCategories)
  }

  const handleCategoryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const category = event.target.value
    if (event.target.checked) {
      setSelectedCategories([...selectedCategories, category])
    } else {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    }
    onSearch(searchText, selectedCategories)
  }

  const handleClearFilters = () => {
    setSearchText("")
    setSelectedCategories([])
    // Si hay estado para "mis recetas", también limpiarlo
    router.push("/recipes")
  }

  return (
    <div className="p-4">
      <input
        type="text"
        placeholder="Search recipes..."
        value={searchText}
        onChange={handleSearchTextChange}
        className="w-full p-2 border rounded-md mb-4"
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

      <button onClick={handleClearFilters} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md">
        Limpiar
      </button>
    </div>
  )
}

export default RecipeSearch
