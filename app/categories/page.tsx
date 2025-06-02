"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { CategoryManager } from "@/components/category-manager"
import { Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Category } from "@/lib/types"
import { getCurrentUserProfile } from "@/lib/auth"
import { RestrictedAccessMessage } from "@/components/restricted-access-message"

interface CategoryWithCount extends Category {
  recipe_count: number
}

export default function CategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [duplicateCategories, setDuplicateCategories] = useState<any[]>([])
  const supabase = getSupabaseClient()
  const profile = getCurrentUserProfile()

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

  if (!profile) {
    return <RestrictedAccessMessage feature="gestión de categorías" />
  }

  // Solo usuarios con permisos completos pueden gestionar categorías
  if (profile.role === "user_restricted") {
    return <RestrictedAccessMessage feature="gestión de categorías" />
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Gestión de Categorías</h1>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Categorías</h1>
        <p className="text-gray-600 mt-2">Organiza tus recetas por categorías</p>
      </div>

      <CategoryManager categories={categories} duplicateCategories={duplicateCategories} />
    </div>
  )
}
