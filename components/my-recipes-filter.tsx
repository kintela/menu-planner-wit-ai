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
      try {
        const supabase = createClientComponentClient()
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
        console.log("Usuario detectado:", data.user?.email)
      } catch (error) {
        console.error("Error obteniendo usuario:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [])

  // Función para manejar el cambio del checkbox
  function toggleMyRecipes() {
    const params = new URLSearchParams(searchParams.toString())

    if (isMyRecipes) {
      params.delete("my")
      console.log("Quitando filtro 'mis recetas'")
    } else {
      params.set("my", "true")
      console.log("Aplicando filtro 'mis recetas'")
    }

    const newUrl = `/recipes?${params.toString()}`
    console.log("Navegando a:", newUrl)
    router.push(newUrl)
  }

  return (
    <div className="bg-yellow-300 border border-yellow-600 p-3 rounded-lg text-black">
      <div className="text-sm font-bold mb-2">DEBUG FILTER</div>

      {isLoading ? (
        <div className="text-black">Cargando usuario...</div>
      ) : !user ? (
        <div className="text-red-800">❌ No hay usuario logueado</div>
      ) : (
        <div className="space-y-2">
          <div className="text-green-800">✅ Usuario: {user.email}</div>

          <button
            onClick={toggleMyRecipes}
            className="flex items-center space-x-2 bg-white p-2 rounded border hover:bg-gray-100 text-black"
          >
            <div
              className={`w-5 h-5 border-2 border-gray-400 rounded flex items-center justify-center ${
                isMyRecipes ? "bg-blue-500 border-blue-500" : "bg-white"
              }`}
            >
              {isMyRecipes && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-black font-medium">Solo mis recetas</span>
          </button>

          <div className="text-xs text-gray-800">Estado: {isMyRecipes ? "ACTIVADO" : "DESACTIVADO"}</div>
        </div>
      )}
    </div>
  )
}
