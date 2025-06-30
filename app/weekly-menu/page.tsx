"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import type { Recipe, WeeklyMenu, MenuItem } from "@/lib/types"

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

interface MenuDay {
  lunch: Recipe[]
  dinner: Recipe[]
}

export default function WeeklyMenuPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [menu, setMenu] = useState<Record<number, MenuDay>>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentMenu, setCurrentMenu] = useState<WeeklyMenu | null>(null)

  // Calcular fechas de la semana
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

  const weekDates = getWeekDates(currentWeek)
  const startDate = weekDates[0]
  const endDate = weekDates[6]

  // Cargar recetas
  useEffect(() => {
    if (user) {
      loadRecipes()
    }
  }, [user])

  // Cargar menú de la semana
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
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      })
    }
  }

  const loadWeeklyMenu = async () => {
    if (!user) return

    setLoading(true)
    try {
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
      toast({
        title: "Error",
        description: "No se pudo cargar el menú semanal",
        variant: "destructive",
      })
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
            name: `Menú ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
            start_date: startDate.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
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

      toast({
        title: "Receta añadida",
        description: `${recipe.name} añadida al ${mealType === "lunch" ? "almuerzo" : "cena"} del ${DAYS[dayIndex]}`,
      })
    } catch (error) {
      console.error("Error adding recipe to menu:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
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

      toast({
        title: "Receta eliminada",
        description: `${recipe.name} eliminada del menú`,
      })
    } catch (error) {
      console.error("Error removing recipe from menu:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    }
  }

  const saveMenu = async () => {
    if (!currentMenu) return

    setSaving(true)
    try {
      const { error } = await supabase.from("weekly_menus").update({ is_saved: true }).eq("id", currentMenu.id)

      if (error) throw error

      setCurrentMenu((prev) => (prev ? { ...prev, is_saved: true } : null))
      toast({
        title: "Menú guardado",
        description: "El menú semanal ha sido guardado exitosamente",
      })
    } catch (error) {
      console.error("Error saving menu:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el menú",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newDate)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Cargando menú semanal...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            Menú Semanal - {startDate.toLocaleDateString()} al {endDate.toLocaleDateString()}
          </h1>
          <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {currentMenu && (
          <Button onClick={saveMenu} disabled={saving || currentMenu.is_saved}>
            <Save className="h-4 w-4 mr-2" />
            {currentMenu.is_saved ? "Guardado" : saving ? "Guardando..." : "Guardar Menú"}
          </Button>
        )}
      </div>

      {/* Weekly Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day, dayIndex) => (
          <Card key={dayIndex} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {day}
                <div className="text-sm font-normal text-muted-foreground">
                  {weekDates[dayIndex].toLocaleDateString()}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Almuerzo */}
              <div>
                <h4 className="font-medium mb-2 text-orange-600">Almuerzo</h4>
                <div className="space-y-2">
                  {menu[dayIndex]?.lunch.map((recipe, recipeIndex) => (
                    <div
                      key={recipeIndex}
                      className="flex items-center justify-between bg-orange-50 p-2 rounded text-sm"
                    >
                      <span className="truncate">{recipe.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipeFromMenu(dayIndex, "lunch", recipeIndex)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Select onValueChange={(value) => addRecipeToMenu(dayIndex, "lunch", value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cena */}
              <div>
                <h4 className="font-medium mb-2 text-blue-600">Cena</h4>
                <div className="space-y-2">
                  {menu[dayIndex]?.dinner.map((recipe, recipeIndex) => (
                    <div key={recipeIndex} className="flex items-center justify-between bg-blue-50 p-2 rounded text-sm">
                      <span className="truncate">{recipe.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipeFromMenu(dayIndex, "dinner", recipeIndex)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Select onValueChange={(value) => addRecipeToMenu(dayIndex, "dinner", value)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Recipes */}
      <Card>
        <CardHeader>
          <CardTitle>Recetas Disponibles ({recipes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="p-2 border rounded text-sm text-center hover:bg-gray-50">
                <div className="font-medium truncate">{recipe.name}</div>
                {recipe.category && <div className="text-xs text-muted-foreground">{recipe.category}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
