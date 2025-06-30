"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import type { Recipe, MenuItem, WeeklyMenu } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface WeeklyMenuViewProps {
  userId: string
}

interface MenuItemWithRecipe extends MenuItem {
  recipe: Recipe
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch", label: "Comida" },
  { key: "dinner", label: "Cena" },
] as const

export function WeeklyMenuView({ userId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemWithRecipe[]>([])
  const [startDate, setStartDate] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const getCurrentWeekStartDate = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(today.getDate() - daysToSubtract)
    return startOfWeek.toISOString().split("T")[0]
  }

  const formatDateRange = (startDate: string) => {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return `${start.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })} - ${end.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })}`
  }

  const loadDataForWeek = async (weekStartDate: string) => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Cargando datos para la semana:", weekStartDate)

      const endOfWeek = new Date(weekStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endDate = endOfWeek.toISOString().split("T")[0]

      // Buscar menú semanal existente
      const { data: weeklyMenuData, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("start_date", weekStartDate)
        .eq("end_date", endDate)
        .eq("user_id", userId)
        .maybeSingle()

      if (menuError) {
        console.error("Error fetching weekly menu:", menuError)
        throw menuError
      }

      let currentMenu = weeklyMenuData

      // Si no existe el menú, crearlo
      if (!currentMenu) {
        const formatDateToDDMMYYYY = (dateString: string): string => {
          const date = new Date(dateString)
          return date.toLocaleDateString("es-ES")
        }

        const { data: newMenu, error: createError } = await supabase
          .from("weekly_menus")
          .insert({
            name: `Menú del ${formatDateToDDMMYYYY(weekStartDate)} al ${formatDateToDDMMYYYY(endDate)}`,
            start_date: weekStartDate,
            end_date: endDate,
            user_id: userId,
            is_saved: false,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating menu:", createError)
          throw createError
        }

        currentMenu = newMenu
        console.log("✅ Nuevo menú creado:", currentMenu.name)
      }

      setWeeklyMenu(currentMenu)

      // Cargar items del menú
      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .eq("weekly_menu_id", currentMenu.id)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError)
        throw itemsError
      }

      setMenuItems((items as unknown as MenuItemWithRecipe[]) || [])

      // Cargar recetas disponibles
      const { data: recipesData, error: recipesError } = await supabase.from("recipes").select("*").order("name")

      if (recipesError) {
        console.error("Error fetching recipes:", recipesError)
        throw recipesError
      }

      setRecipes(recipesData || [])
      console.log("✅ Datos cargados correctamente")
    } catch (err) {
      console.error("❌ Error cargando datos:", err)
      setError("Error al cargar los datos del menú semanal")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      const currentWeekStart = getCurrentWeekStartDate()
      setStartDate(currentWeekStart)
      loadDataForWeek(currentWeekStart)
    }
  }, [userId])

  const changeWeek = (direction: "prev" | "next") => {
    const currentStart = new Date(startDate)
    const newStart = new Date(currentStart)

    if (direction === "prev") {
      newStart.setDate(currentStart.getDate() - 7)
    } else {
      newStart.setDate(currentStart.getDate() + 7)
    }

    const newStartDate = newStart.toISOString().split("T")[0]
    setStartDate(newStartDate)
    loadDataForWeek(newStartDate)
  }

  const getMenuItemsForDay = (dayIndex: number, mealType: "lunch" | "dinner") => {
    return menuItems.filter((item) => item.day_of_week === dayIndex && item.meal_type === mealType)
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: "lunch" | "dinner", recipeId: string) => {
    if (!weeklyMenu) return

    try {
      const existingItems = getMenuItemsForDay(dayIndex, mealType)
      const dishOrder = existingItems.length

      const { data: newItem, error } = await supabase
        .from("menu_items")
        .insert({
          weekly_menu_id: weeklyMenu.id,
          recipe_id: recipeId,
          day_of_week: dayIndex,
          meal_type: mealType,
          dish_order: dishOrder,
        })
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .single()

      if (error) {
        console.error("Error adding recipe to menu:", error)
        throw error
      }

      setMenuItems((prev) => [...prev, newItem as unknown as MenuItemWithRecipe])

      toast({
        title: "Receta añadida",
        description: "La receta se ha añadido al menú correctamente",
      })
    } catch (error) {
      console.error("Error adding recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    }
  }

  const removeRecipeFromMenu = async (menuItemId: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", menuItemId)

      if (error) {
        console.error("Error removing recipe from menu:", error)
        throw error
      }

      setMenuItems((prev) => prev.filter((item) => item.id !== menuItemId))

      toast({
        title: "Receta eliminada",
        description: "La receta se ha eliminado del menú correctamente",
      })
    } catch (error) {
      console.error("Error removing recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    }
  }

  const saveMenu = async () => {
    if (!weeklyMenu) return

    try {
      setSaving(true)

      const { error } = await supabase.from("weekly_menus").update({ is_saved: true }).eq("id", weeklyMenu.id)

      if (error) {
        console.error("Error saving menu:", error)
        throw error
      }

      setWeeklyMenu((prev) => (prev ? { ...prev, is_saved: true } : null))

      toast({
        title: "Menú guardado",
        description: "El menú semanal se ha guardado correctamente",
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-600">{error}</div>
        <Button onClick={() => loadDataForWeek(startDate)}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación de semanas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{weeklyMenu?.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateRange(startDate)}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={saveMenu} disabled={saving || weeklyMenu?.is_saved} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : weeklyMenu?.is_saved ? "Guardado" : "Guardar Menú"}
        </Button>
      </div>

      {/* Grid de días */}
      <div className="grid gap-4 md:grid-cols-7">
        {DAYS.map((day, dayIndex) => (
          <Card key={day} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TYPES.map(({ key: mealType, label }) => (
                <div key={mealType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{label}</h4>
                  </div>

                  {/* Recetas existentes */}
                  <div className="space-y-2">
                    {getMenuItemsForDay(dayIndex, mealType).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                        <span className="truncate">{item.recipe.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipeFromMenu(item.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Selector para añadir recetas */}
                  <Select onValueChange={(recipeId) => addRecipeToMenu(dayIndex, mealType, recipeId)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes
                        .filter(
                          (recipe) =>
                            !getMenuItemsForDay(dayIndex, mealType).some((item) => item.recipe_id === recipe.id),
                        )
                        .map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de recetas */}
      {recipes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Recetas Disponibles ({recipes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <h4 className="font-medium text-sm truncate">{recipe.name}</h4>
                  {recipe.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
                  )}
                  {recipe.category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      {recipe.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WeeklyMenuView
