"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import type { Category, Recipe } from "@/lib/types"

import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import Link from "next/link"
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
  const [canEdit, setCanEdit] = useState<boolean | null>(null)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    //console.log("[DEBUG] user:", user, "authLoading:", authLoading, "params.id:", params.id)
    async function checkPermissionsAndLoadData() {
      if (authLoading) return

      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Normalizar ID y validar
        const rawId = Array.isArray((params as any).id) ? (params as any).id[0] : (params as any).id
        const idNum = Number(rawId)
        if (!rawId || Number.isNaN(idNum)) {
          setError("ID de receta inválido")
          return
        }

        // Timeout helper
        const withTimeout = async <T,>(p: Promise<T>, ms = 12000): Promise<T> => {
          return await Promise.race([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms)) as Promise<T>,
          ])
        }

        // Mostrar aviso de lentitud si tarda mucho
        const slowTimer = setTimeout(() => setSlow(true), 6000)

        // Primero obtener la receta (con timeout) vía API
        const recipeResponse = await withTimeout(
          fetch(`/api/recipes/${idNum}`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
          12000,
        )

        if (!recipeResponse.ok) {
          console.warn("[EditRecipePage] /api/recipes", idNum, "respondió", recipeResponse.status)
          setError(recipeResponse.status === 404 ? "Receta no encontrada" : "Error al cargar la receta")
          setLoading(false)
          return
        }

        const recipeData = await recipeResponse.json()
        setRecipe(recipeData)

        // Solo el autor puede editar (alineado con el resto de la app)
        const hasPermission = recipeData.user_id === user.id
        setCanEdit(hasPermission)
        //console.log("[DEBUG] isAuthor:", isAuthor, "isAdmin:", isAdmin, "hasPermission:", hasPermission)

        // Si tiene permisos, cargar categorías
        if (hasPermission) {
          const recipeCategories = Array.isArray(recipeData?.recipe_categories)
            ? recipeData.recipe_categories
            : []

          const categoryIds = recipeCategories
            .map((rc: any) => rc.category_id || rc.categories?.id)
            .filter((id: any) => id !== undefined && id !== null)
            .map((id: any) => Number(id))
          setSelectedCategoryIds(categoryIds)
          console.log("[DEBUG] recipeCategories:", recipeCategories)

          // Obtener todas las categorías vía API (evita RLS en el cliente)
          const categoriesResponse = await withTimeout(
            fetch("/api/categories", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            }),
            10000,
          )

          if (!categoriesResponse.ok) {
            console.warn("[EditRecipePage] /api/categories respondió", categoriesResponse.status)
            setCategories([])
          } else {
            const payload = await categoriesResponse.json()
            const categoriesData = Array.isArray(payload?.categories) ? payload.categories : []
            setCategories(categoriesData)
            console.log("[DEBUG] categoriesData:", categoriesData)
          }
        }
        clearTimeout(slowTimer)
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err instanceof Error && err.message === "TIMEOUT" ? "La carga tardó demasiado" : "Error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }

    checkPermissionsAndLoadData()
  }, [params.id, user, authLoading])


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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="mt-4 text-xl font-semibold text-gray-900">Iniciar Sesión Requerido</CardTitle>
            <CardDescription className="mt-2 text-sm text-gray-600">
              Necesitas iniciar sesión para poder editar únicamente tus recetas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href={`/login?redirect=/recipes/${params.id}/edit`}>Iniciar Sesión</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar loading mientras se cargan los datos
  if (loading) {

    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando permisos...</span>
          {slow && (
            <span className="ml-4 text-sm text-muted-foreground">Está tardando más de lo normal…</span>
          )}
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
  if (canEdit === false) {

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
  if (canEdit === true && recipe) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver a recetas
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex-1 text-center">Editar Receta</h1>
          <div className="w-[140px]"></div> {/* Spacer para centrar el título */}
        </div>
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
