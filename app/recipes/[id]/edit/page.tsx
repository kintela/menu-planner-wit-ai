"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import type { Category, Recipe } from "@/lib/types"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EditRecipePage() {
  const params = useParams()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const supabase = getSupabaseClient()

        // Verificar si el usuario está autenticado
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !currentUser) {
          // Redirigir al login con la URL de retorno
          const returnUrl = encodeURIComponent(`/recipes/${params.id}/edit`)
          router.push(`/login?returnUrl=${returnUrl}`)
          return
        }

        setUser(currentUser)

        // Obtener la receta
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", params.id)
          .single()

        if (recipeError || !recipeData) {
          setError("Receta no encontrada")
          return
        }

        // Verificar si el usuario es el autor de la receta
        if (recipeData.user_id !== currentUser.id) {
          // Verificar si es admin
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", currentUser.id)
            .single()

          if (!profile || profile.role !== "admin") {
            setAuthError("Solo puedes editar tus propias recetas. Esta receta pertenece a otro usuario.")
            return
          }
        }

        setRecipe(recipeData)

        // Obtener las categorías de la receta
        const { data: recipeCategories } = await supabase
          .from("recipe_categories")
          .select("category_id")
          .eq("recipe_id", recipeData.id)

        const categoryIds = recipeCategories?.map((rc) => rc.category_id) || []
        setSelectedCategoryIds(categoryIds)

        // Obtener todas las categorías
        const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

        setCategories(categoriesData || [])

        console.log("Recipe loaded:", recipeData)
        console.log("Selected Category IDs:", categoryIds)
        console.log("All Categories:", categoriesData)
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      checkAuthAndLoadData()
    }
  }, [params.id, router])

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando permisos y cargando receta...</span>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
        <div className="flex gap-4">
          <Button asChild>
            <Link href={`/recipes/${params.id}`}>Volver a la receta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/recipes">Ver todas las recetas</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Receta no encontrada"}</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/recipes">Volver a las recetas</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Editar Receta</h1>
      <EditRecipeForm recipe={recipe} categories={categories} selectedCategoryIds={selectedCategoryIds} />
    </div>
  )
}
