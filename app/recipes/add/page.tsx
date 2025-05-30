"use client"

import { useAuth } from "@/components/auth/auth-provider"
import AddRecipeForm from "@/components/add-recipe-form"
import { Loader2, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function AddRecipePage() {
  const { user, loading } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Cargar categorías cuando el usuario esté autenticado
  useEffect(() => {
    async function loadCategories() {
      if (!user) return

      try {
        setCategoriesLoading(true)
        const supabase = getSupabaseClient()

        const { data, error } = await supabase.from("categories").select("*").order("name")

        if (error) {
          console.error("Error loading categories:", error)
        } else {
          console.log("Categorías cargadas:", data)
          setCategories(data || [])
        }
      } catch (error) {
        console.error("Error loading categories:", error)
      } finally {
        setCategoriesLoading(false)
      }
    }

    loadCategories()
  }, [user])

  // Mostrar loading mientras se verifica la autenticación
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

  // Si no está autenticado, mostrar mensaje de acceso restringido
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

  // Mostrar loading mientras se cargan las categorías
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

  // Si está autenticado, mostrar el formulario de añadir recetas con categorías
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Añadir Nueva Receta</h1>
        <AddRecipeForm />
      </div>
    </div>
  )
}
