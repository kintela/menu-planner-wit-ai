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
import { RestrictedAccessMessage } from "@/components/restricted-access-message"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditRecipePage() {
  const params = useParams()
  const { user, loading } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthorChecked, setIsAuthorChecked] = useState(false)

  const router = useRouter()

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabaseClient()

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

        setRecipe(recipeData)

        // Verificar si el usuario es el autor de la receta
        if (recipeData.user_id !== user.id) {
          // Verificar si es admin
          const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

          if (!profile || profile.role !== "admin") {
            setAuthError("Solo puedes editar tus propias recetas. Esta receta pertenece a otro usuario.")
            setIsAuthorChecked(true)
            return
          }
        }

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
        setIsAuthorChecked(true)

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

    if (user && params.id) {
      loadData()
    }
  }, [params.id, user])

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando autenticación...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <RestrictedAccessMessage
        message="Necesitas iniciar sesión para poder editar únicamente tus recetas"
        redirectPath={`/recipes/${params.id}/edit`}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando receta...</span>
        </div>
      </div>
    )
  }

  if (authError && isAuthorChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="mt-4 text-xl font-semibold text-gray-900">Acceso Restringido</CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              Solo puedes editar tus propias recetas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </CardContent>
        </Card>
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
