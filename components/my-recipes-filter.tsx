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
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="my-recipes"
        checked={isMyRecipes}
        onChange={toggleMyRecipes}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="my-recipes" className="text-sm font-medium text-gray-700">
        Solo mis recetas
      </label>
    </div>
  )
}
