"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import type { Category, Recipe } from "@/lib/types"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { RestrictedAccessMessage } from "@/components/restricted-access-message"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditRecipePage() {
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionChecked, setPermissionChecked] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    async function checkPermissionsAndLoadData() {
      if (authLoading) return

      if (!user) {
        setLoading(false)
        setPermissionChecked(true)
        return
      }

      try {
        const supabase = getSupabaseClient()

        console.log("Checking permissions for user:", user.id, "recipe:", params.id)

        // Primero obtener la receta
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", params.id)
          .single()

        if (recipeError || !recipeData) {
          console.error("Recipe error:", recipeError)
          setError("Receta no encontrada")
          setLoading(false)
          setPermissionChecked(true)
          return
        }

        console.log("Recipe loaded:", recipeData)
        console.log("Recipe author:", recipeData.user_id)
        console.log("Current user:", user.id)

        setRecipe(recipeData)

        // Verificar permisos
        let userHasPermission = false

        // Verificar si es el autor
        if (recipeData.user_id === user.id) {
          console.log("User is the author")
          userHasPermission = true
        } else {
          console.log("User is NOT the author, checking if admin...")
          // Verificar si es admin
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .single()

          console.log("Profile data:", profile, "Error:", profileError)

          if (profile?.role === "admin") {
            console.log("User is admin")
            userHasPermission = true
          } else {
            console.log("User is NOT admin")
          }
        }

        console.log("Final permission result:", userHasPermission)
        setHasPermission(userHasPermission)

        // Si tiene permisos, cargar categorías
        if (userHasPermission) {
          console.log("Loading categories...")
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
          console.log("Categories loaded:", categoriesData)
        }
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Error al cargar los datos")
      } finally {
        setLoading(false)
        setPermissionChecked(true)
      }
    }

    checkPermissionsAndLoadData()
  }, [params.id, user, authLoading])

  console.log("Render state:", {
    authLoading,
    user: !!user,
    loading,
    permissionChecked,
    hasPermission,
    recipe: !!recipe,
    error,
  })

  // Mostrar loading mientras se verifica la autenticación
  if (authLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando autenticación...</span>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar mensaje de login
  if (!user) {
    return (
      <RestrictedAccessMessage
        message="Necesitas iniciar sesión para poder editar únicamente tus recetas"
        redirectPath={`/recipes/${params.id}/edit`}
      />
    )
  }

  // Mostrar loading mientras se cargan los datos
  if (loading || !permissionChecked) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando permisos...</span>
        </div>
      </div>
    )
  }

  // Si hay error, mostrar mensaje de error
  if (error) {
    return (
      <div className="container py-10">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Si no tiene permisos para editar, mostrar mensaje de acceso restringido
  if (permissionChecked && !hasPermission) {
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

  // Si tiene permisos y la receta existe, mostrar el formulario de edición
  if (permissionChecked && hasPermission && recipe) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Editar Receta</h1>
        <EditRecipeForm recipe={recipe} categories={categories} selectedCategoryIds={selectedCategoryIds} />
      </div>
    )
  }

  // Fallback - no debería llegar aquí
  return (
    <div className="container py-10">
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando...</span>
      </div>
    </div>
  )
}
