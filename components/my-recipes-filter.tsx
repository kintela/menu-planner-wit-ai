"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function MyRecipesFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Obtener el estado actual del checkbox desde la URL
  const isMyRecipes = searchParams.get("my") === "true"

  // Obtener el usuario al cargar el componente
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClientComponentClient()
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setIsLoading(false)
    }

    getUser()
  }, [])

  // Función para manejar el cambio del checkbox
  function toggleMyRecipes() {
    // Crear una nueva instancia de URLSearchParams para no mutar la original
    const params = new URLSearchParams(searchParams.toString())

    // Invertir el estado actual
    if (isMyRecipes) {
      params.delete("my")
    } else {
      params.set("my", "true")
    }

    // Navegar a la nueva URL
    const newUrl = `/recipes?${params.toString()}`
    console.log("Navegando a:", newUrl)
    router.push(newUrl)
  }

  // Si no hay usuario, no mostrar nada
  if (isLoading) {
    return <div className="bg-yellow-100 p-2 rounded text-xs">Cargando...</div>
  }

  if (!user) {
    return <div className="bg-yellow-100 p-2 rounded text-xs">No hay usuario logueado</div>
  }

  return (
    <div className="bg-yellow-100 p-2 rounded">
      <button onClick={toggleMyRecipes} className="flex items-center space-x-2 text-sm">
        <div className={`w-4 h-4 border rounded ${isMyRecipes ? "bg-blue-500" : "bg-white"}`}>
          {isMyRecipes && <span className="text-white flex justify-center items-center">✓</span>}
        </div>
        <span>Solo mis recetas</span>
      </button>
      <div className="text-xs mt-1">
        Usuario: {user.email} | ID: {user.id?.substring(0, 8)}...
      </div>
    </div>
  )
}
