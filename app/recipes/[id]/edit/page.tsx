"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { RestrictedAccessMessage } from "@/components/restricted-access-message"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EditRecipePage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAuthor, setIsAuthor] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function fetchRecipe() {
      if (authLoading) return

      if (!user) {
        setLoading(false)
        return
      }

      try {
        const supabase = getSupabaseClient()

        // Verificar si el usuario es admin
        const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        const isUserAdmin = profileData?.role === "admin"
        setIsAdmin(isUserAdmin)

        // Obtener la receta
        const { data, error } = await supabase.from("recipes").select("*").eq("id", id).single()

        if (error) throw error

        setRecipe(data)

        // Verificar si el usuario es el autor
        setIsAuthor(data.user_id === user.id)

        setLoading(false)
      } catch (error) {
        console.error("Error fetching recipe:", error)
        setError(error.message)
        setLoading(false)
      }
    }

    fetchRecipe()
  }, [id, user, authLoading])

  // Si no está autenticado, mostrar mensaje de acceso restringido
  if (!authLoading && !user) {
    return <RestrictedAccessMessage message="Necesitas iniciar sesión para poder editar únicamente tus recetas" />
  }

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Cargando receta...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/recipes">Volver a recetas</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Si el usuario no es el autor ni admin, mostrar mensaje
  if (recipe && !isAuthor && !isAdmin) {
    return (
      <div className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-800 mb-2">Acceso Restringido</h2>
            <p className="text-amber-700">Solo puedes editar tus propias recetas.</p>
            <div className="flex gap-3 mt-4">
              <Button asChild>
                <Link href={`/recipes/${id}`}>Volver a la receta</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recipes">Ver todas las recetas</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return recipe ? <EditRecipeForm recipe={recipe} /> : null
}
