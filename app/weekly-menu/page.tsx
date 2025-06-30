"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
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
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .or(`user_id.eq.${user?.id},is_public.eq.true`)
        .order("name")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error loading recipes:", error)
      // toast({
      //   title: "Error",
      //   description: "No se pudieron cargar las recetas",
      //   variant: "destructive",
      // })
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
      // toast({
      //   title: "Error",
      //   description: "No se pudo cargar el menú semanal",
      //   variant: "destructive",
      // })
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

      // toast({
      //   title: "Receta añadida",
      //   description: `${recipe.name} añadida al ${mealType === "lunch" ? "almuerzo" : "cena"} del ${DAYS[dayIndex]}`,
      // })
    } catch (error) {
      console.error("Error adding recipe to menu:", error)
      // toast({
      //   title: "Error",
      //   description: "No se pudo añadir la receta al menú",
      //   variant: "destructive",
      // })
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

      // toast({
      //   title: "Receta eliminada",
      //   description: `${recipe.name} eliminada del menú`,
      // })
    } catch (error) {
      console.error("Error removing recipe from menu:", error)
      // toast({
      //   title: "Error",
      //   description: "No se pudo eliminar la receta del menú",
      //   variant: "destructive",
      // })
    }
  }

  const saveMenu = async () => {
    if (!currentMenu) return

    setSaving(true)
    try {
      const { error } = await supabase.from("weekly_menus").update({ is_saved: true }).eq("id", currentMenu.id)

      if (error) throw error

      setCurrentMenu((prev) => (prev ? { ...prev, is_saved: true } : null))
      // toast({
      //   title: "Menú guardado",
      //   description: "El menú semanal ha sido guardado exitosamente",
      // })
    } catch (error) {
      console.error("Error saving menu:", error)
      // toast({
      //   title: "Error",
      //   description: "No se pudo guardar el menú",
      //   variant: "destructive",
      // })
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
  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso requerido</h2>
          <p className="text-gray-600 mb-4">Necesitas iniciar sesión para acceder al planificador de menús.</p>
          <a href="/login" className="text-blue-600 hover:underline">
            Iniciar sesión
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />
      <div className="container mx-auto px-4 py-8">
        <WeeklyMenuView userId={user.id} />
      </div>
    </div>
  )
}
