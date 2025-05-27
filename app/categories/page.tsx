"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase/client"
import { CategoryManager } from "@/components/category-manager"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Category } from "@/lib/types"

interface CategoryWithCount extends Category {
  recipe_count: number
}

export default function CategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [duplicateCategories, setDuplicateCategories] = useState<any[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Obtener categorías si el usuario está autenticado
          const { data: categoriesWithCount, error } = await supabase
            .from("categories")
            .select(`
              *,
              recipe_count:recipe_categories(count)
            `)
            .order("name")

          if (!error && categoriesWithCount) {
            // Formatear los datos
            const formattedCategories = categoriesWithCount.map((category: any) => ({
              ...category,
              recipe_count: category.recipe_count[0]?.count || 0,
            })) as CategoryWithCount[]

            setCategories(formattedCategories)

            // Agrupar categorías duplicadas
            const categoriesByName: Record<string, CategoryWithCount[]> = {}
            formattedCategories.forEach((category) => {
              const lowerName = category.name.toLowerCase()
              if (!categoriesByName[lowerName]) {
                categoriesByName[lowerName] = []
              }
              categoriesByName[lowerName].push(category)
            })

            const duplicates = Object.entries(categoriesByName)
              .filter(([_, categories]) => categories.length > 1)
              .map(([name, categories]) => ({
                name,
                categories,
              }))

            setDuplicateCategories(duplicates)
          }
        }
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setCategories([])
        setDuplicateCategories([])
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Categorías</h1>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Categorías</h1>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              Necesitas iniciar sesión para gestionar las categorías de recetas.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/login?redirect=/categories">Iniciar Sesión</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Gestión de Categorías</h1>
      <CategoryManager categories={categories} duplicateCategories={duplicateCategories} />
    </div>
  )
}
