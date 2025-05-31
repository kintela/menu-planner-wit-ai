"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"

export function MyRecipesFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()

  // Obtener el estado actual del checkbox desde la URL
  const isMyRecipes = searchParams.get("my") === "true"

  // Función para manejar el cambio del checkbox
  function toggleMyRecipes() {
    const params = new URLSearchParams(searchParams.toString())

    if (isMyRecipes) {
      params.delete("my")
    } else {
      params.set("my", "true")
    }

    const newUrl = `/recipes?${params.toString()}`
    router.push(newUrl)
  }

  // Solo mostrar si hay usuario logueado
  if (loading || !user) {
    return null
  }

  return (
    <div className="flex items-center space-x-2 ml-4">
      <input
        type="checkbox"
        id="my-recipes"
        checked={isMyRecipes}
        onChange={toggleMyRecipes}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
      />
      <label
        htmlFor="my-recipes"
        className="text-sm font-medium text-white cursor-pointer hover:text-gray-200 select-none"
      >
        Solo mis recetas
      </label>
    </div>
  )
}
