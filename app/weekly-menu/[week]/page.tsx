"use client"

import { Suspense, useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { SimpleNavigation } from "@/components/simple-navigation"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { LoginForm } from "@/components/auth/login-form"
import { supabase } from "@/lib/supabase/client"
import type { Recipe as RecipeType } from "@/lib/types"

function getCurrentWeekStartIso() {
  const today = new Date()
  const monday = new Date(today)
  const day = monday.getDay()
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

async function getRecipes(): Promise<RecipeType[]> {
  try {
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        id,
        name,
        calories,
        image_url,
        user_profiles (
          id,
          full_name,
          first_name,
          last_name,
          alias,
          avatar_url,
          email
        )
      `)
      .order("name")

    if (error) {
      console.error("Error cargando recetas:", error)
      return []
    }

    return recipes || []
  } catch (error) {
    console.error("Error en getRecipes:", error)
    return []
  }
}

function normalizeWeekParam(weekParam?: string) {
  if (!weekParam) return { value: getCurrentWeekStartIso(), isValid: false }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    console.warn("[WeeklyMenu] Parámetro de semana inválido:", weekParam)
    return { value: getCurrentWeekStartIso(), isValid: false }
  }
  const parsed = new Date(`${weekParam}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    console.warn("[WeeklyMenu] Parámetro de semana inválido:", weekParam)
    return { value: getCurrentWeekStartIso(), isValid: false }
  }
  return { value: weekParam, isValid: true }
}

export default function WeeklyMenuPage({ params }: { params: Promise<{ week: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const { user, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  const { value: initialWeekStart, isValid: isWeekParamValid } = normalizeWeekParam(resolvedParams?.week)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || isWeekParamValid) return
    router.replace(`/weekly-menu/${initialWeekStart}`)
  }, [initialWeekStart, isWeekParamValid, mounted, router])

  useEffect(() => {
    const fetchRecipes = async () => {
      const recipesData = await getRecipes()
      setRecipes(recipesData)
    }

    void fetchRecipes()
  }, [])

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleNavigation />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SimpleNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Necesitas iniciar sesión</h1>
              <p className="text-gray-600">Para acceder al planificador de menús necesitas tener una cuenta.</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Planificador Semanal</h1>
          <p className="text-gray-600 mt-2">Organiza tus comidas para toda la semana</p>
        </div>

        <Suspense fallback={<div className="text-center py-8">Cargando planificador...</div>}>
          <WeeklyMenuView initialRecipes={recipes} userId={user.id} initialWeekStart={initialWeekStart} />
        </Suspense>
      </div>
    </div>
  )
}
