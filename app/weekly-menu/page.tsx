"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SimpleNavigation } from "@/components/simple-navigation"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { supabase } from "@/lib/supabase/client"
import type { Recipe, WeeklyMenu, MenuItem } from "@/lib/types"

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

interface MenuDay {
  lunch: Recipe[]
  dinner: Recipe[]
}

export default function WeeklyMenuPage() {
  const { user, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [menu, setMenu] = useState<Record<number, MenuDay>>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentMenu, setCurrentMenu] = useState<WeeklyMenu | null>(null)

  const [weekDates, setWeekDates] = useState<Date[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      loadRecipes()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadWeeklyMenu()
    }
  }, [user, currentWeek])

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase.from("recipes").select("*").eq("user_id", user?.id).order("name")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error loading recipes:", error)
    }
  }

  const loadWeeklyMenu = async () => {
    if (!user) return

    setLoading(true)
    try {
      const weekDates = getWeekDates(currentWeek)
      const startDate = weekDates[0]
      const endDate = weekDates[6]
      setWeekDates(weekDates)
      setStartDate(startDate)
      setEndDate(endDate)

      // Buscar menú existente para esta semana
      const { data: menuData, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", user.id)
        .eq("start_date", startDate.toISOString().split("T")[0])
        .single()

      if (menuError && menuError.code !== "PGRST116") {
        throw menuError
      }

      setCurrentMenu(menuData)

      if (menuData) {
        // Cargar items del menú
        const { data: itemsData, error: itemsError } = await supabase
          .from("menu_items")
          .select(`
            *,
            recipe:recipes(*)
          `)
          .eq("weekly_menu_id", menuData.id)

        if (itemsError) throw itemsError

        // Organizar items por día y tipo de comida
        const menuByDay: Record<number, MenuDay> = {}

        for (let i = 0; i < 7; i++) {
          menuByDay[i] = { lunch: [], dinner: [] }
        }

        itemsData?.forEach((item: MenuItem & { recipe: Recipe }) => {
          if (item.recipe) {
            menuByDay[item.day_of_week][item.meal_type].push(item.recipe)
          }
        })

        setMenu(menuByDay)
      } else {
        // Inicializar menú vacío
        const emptyMenu: Record<number, MenuDay> = {}
        for (let i = 0; i < 7; i++) {
          emptyMenu[i] = { lunch: [], dinner: [] }
        }
        setMenu(emptyMenu)
      }
    } catch (error) {
      console.error("Error loading weekly menu:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: "lunch" | "dinner", recipeId: string) => {
    if (!user) return

    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) return

    try {
      // Crear menú si no existe
      let menuId = currentMenu?.id
      if (!menuId) {
        const { data: newMenu, error: menuError } = await supabase
          .from("weekly_menus")
          .insert({
            name: `Menú ${startDate?.toLocaleDateString()} - ${endDate?.toLocaleDateString()}`,
            start_date: startDate?.toISOString().split("T")[0],
            end_date: endDate?.toISOString().split("T")[0],
            user_id: user.id,
            is_saved: false,
          })
          .select()
          .single()

        if (menuError) throw menuError
        setCurrentMenu(newMenu)
        menuId = newMenu.id
      }

      // Añadir item al menú
      const { error: itemError } = await supabase.from("menu_items").insert({
        weekly_menu_id: menuId,
        recipe_id: recipeId,
        day_of_week: dayIndex,
        meal_type: mealType,
        dish_order: menu[dayIndex][mealType].length,
      })

      if (itemError) throw itemError

      // Actualizar estado local
      setMenu((prev) => ({
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          [mealType]: [...prev[dayIndex][mealType], recipe],
        },
      }))
    } catch (error) {
      console.error("Error adding recipe to menu:", error)
    }
  }

  const removeRecipeFromMenu = async (dayIndex: number, mealType: "lunch" | "dinner", recipeIndex: number) => {
    if (!currentMenu) return

    const recipe = menu[dayIndex][mealType][recipeIndex]
    if (!recipe) return

    try {
      // Eliminar item del menú
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("weekly_menu_id", currentMenu.id)
        .eq("recipe_id", recipe.id)
        .eq("day_of_week", dayIndex)
        .eq("meal_type", mealType)

      if (error) throw error

      // Actualizar estado local
      setMenu((prev) => ({
        ...prev,
        [dayIndex]: {
          ...prev[dayIndex],
          [mealType]: prev[dayIndex][mealType].filter((_, index) => index !== recipeIndex),
        },
      }))
    } catch (error) {
      console.error("Error removing recipe from menu:", error)
    }
  }

  const saveMenu = async () => {
    if (!currentMenu) return

    setSaving(true)
    try {
      const { error } = await supabase.from("weekly_menus").update({ is_saved: true }).eq("id", currentMenu.id)

      if (error) throw error

      setCurrentMenu((prev) => (prev ? { ...prev, is_saved: true } : null))
    } catch (error) {
      console.error("Error saving menu:", error)
    } finally {
      setSaving(false)
    }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newDate)
  }

  const getWeekDates = (date: Date) => {
    const monday = new Date(date)
    const day = monday.getDay()
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1)
    monday.setDate(diff)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      dates.push(day)
    }
    return dates
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8" suppressHydrationWarning>
        <SimpleNavigation />
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen">
        <SimpleNavigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Show login required if no user
  if (!user) {
    return (
      <div className="min-h-screen">
        <SimpleNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold">Planificador de Menús Semanales</h1>
            <p className="text-lg text-muted-foreground">
              Necesitas iniciar sesión para acceder al planificador de menús
            </p>
            <Link href="/login">
              <Button size="lg">Iniciar Sesión</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show the weekly menu view
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        <WeeklyMenuView userId={user.id} />
      </div>
    </div>
  )
}
