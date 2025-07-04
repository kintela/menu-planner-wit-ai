"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { AddRecipeForm } from "@/components/add-recipe-form"
import { Loader2, AlertCircle, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AddRecipePage() {
  const { user, loading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoriesLoading(true)
        setCategoriesError(null)

        const supabase = createClient()

        console.log("Intentando cargar categorías...")

        // Try to load categories with a more generous timeout and retry logic
        const { data, error } = await supabase.from("categories").select("*").order("name")

        if (error) {
          console.error("Error loading categories:", error)
          // Don't treat this as a fatal error - just proceed without categories
          console.log("Procediendo sin categorías debido al error:", error.message)
          setCategories([])
        } else {
          setCategories(data || [])
          console.log("Categorías cargadas:", data?.length || 0)
        }
      } catch (error) {
        console.error("Error loading categories:", error)
        // Don't treat this as a fatal error - just proceed without categories
        console.log("Procediendo sin categorías debido al error de conexión")
        setCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }

    // Only load categories if user is authenticated or auth is not loading
    if (user || !loading) {
      loadCategories()
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Añadir Nueva Receta</h1>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                Acceso Restringido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-yellow-700 dark:text-yellow-300">
                Necesitas iniciar sesión para añadir nuevas recetas.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/login?redirect=/recipes/add">Iniciar Sesión</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">Volver al Inicio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (categoriesLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Añadir Nueva Receta</h1>
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
            <p>Cargando categorías...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Añadir Nueva Receta</h1>
        {categories.length === 0 ? (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 mb-6">
            <CardContent className="pt-6">
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                No hay categorías disponibles. Puedes añadir la receta sin categorías o crear algunas primero.
              </p>
              <Button asChild>
                <Link href="/categories">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Categorías
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-4 text-sm text-muted-foreground">
            {categories.length} categoría{categories.length !== 1 ? "s" : ""} disponible
            {categories.length !== 1 ? "s" : ""}
          </div>
        )}
        <AddRecipeForm categories={categories} />
      </div>
    </div>
  )
}
