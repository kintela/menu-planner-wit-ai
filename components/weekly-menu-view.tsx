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
  {
    key: "lunch",
    label: "Comida",
    dishes: [
      { order: 0, label: "Primer plato" },
      { order: 1, label: "Segundo plato" },
    ],
  },
  { key: "dinner", label: "Cena", dishes: [{ order: 0, label: "Plato único" }] },
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

      // Inicializar estados
      setWeeklyMenu(weeklyMenuData)
      setMenuItems([])

      // Solo cargar items del menú si existe el menú
      if (weeklyMenuData) {
        const { data: items, error: itemsError } = await supabase
          .from("menu_items")
          .select(`
            *,
            recipe:recipe_id (*)
          `)
          .eq("weekly_menu_id", weeklyMenuData.id)
          .order("day_of_week")
          .order("meal_type")
          .order("dish_order")

        if (itemsError) {
          console.error("Error fetching menu items:", itemsError)
          throw itemsError
        }

        setMenuItems((items as unknown as MenuItemWithRecipe[]) || [])
        console.log("✅ Menú y items cargados correctamente")
      } else {
        console.log("📝 No hay menú para esta semana, mostrando vacío")
      }

      // Cargar recetas disponibles (siempre, independientemente del menú)
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

  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: "lunch" | "dinner", dishOrder: number) => {
    return menuItems.filter(
      (item) => item.day_of_week === dayIndex && item.meal_type === mealType && item.dish_order === dishOrder,
    )
  }

  const createWeeklyMenuIfNeeded = async () => {
    if (weeklyMenu) return weeklyMenu.id

    const endOfWeek = new Date(startDate)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const endDate = endOfWeek.toISOString().split("T")[0]

    const formatDateToDDMMYYYY = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES")
    }

    const { data: newMenu, error: createError } = await supabase
      .from("weekly_menus")
      .insert({
        name: `Menú del ${formatDateToDDMMYYYY(startDate)} al ${formatDateToDDMMYYYY(endDate)}`,
        start_date: startDate,
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

    setWeeklyMenu(newMenu)
    console.log("✅ Nuevo menú creado:", newMenu.name)
    return newMenu.id
  }

  const addRecipeToMenu = async (
    dayIndex: number,
    mealType: "lunch" | "dinner",
    dishOrder: number,
    recipeId: string,
  ) => {
    try {
      // Verificar si ya existe una receta en esta posición
      const existingItems = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)
      if (existingItems.length > 0) {
        // Eliminar la receta existente primero
        await removeRecipeFromMenu(existingItems[0].id)
      }

      // Crear menú si no existe
      const menuId = await createWeeklyMenuIfNeeded()

      const { data: newItem, error } = await supabase
        .from("menu_items")
        .insert({
          weekly_menu_id: menuId,
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

      setMenuItems((prev) => [
        ...prev.filter(
          (item) => !(item.day_of_week === dayIndex && item.meal_type === mealType && item.dish_order === dishOrder),
        ),
        newItem as unknown as MenuItemWithRecipe,
      ])

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
    if (!weeklyMenu) {
      toast({
        title: "No hay menú",
        description: "Añade algunas recetas antes de guardar el menú",
        variant: "destructive",
      })
      return
    }

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

  const menuTitle = weeklyMenu?.name || `Nuevo Menú - ${formatDateRange(startDate)}`

  return (
    <div className="space-y-6">
      {/* Header con navegación de semanas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{menuTitle}</h1>
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
          <Card key={day} className="min-h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TYPES.map(({ key: mealType, label, dishes }) => (
                <div key={mealType} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${mealType === "lunch" ? "text-orange-600" : "text-blue-600"}`}>
                      {label}
                    </h4>
                  </div>

                  {/* Platos */}
                  <div className="space-y-2">
                    {dishes.map(({ order: dishOrder, label: dishLabel }) => {
                      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)[0]

                      return (
                        <div key={dishOrder} className="space-y-1">
                          <div className="text-xs text-muted-foreground">{dishLabel}</div>

                          {/* Receta existente */}
                          {existingItem && (
                            <div
                              className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                mealType === "lunch" ? "bg-orange-50" : "bg-blue-50"
                              }`}
                            >
                              <span className="truncate">{existingItem.recipe.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRecipeFromMenu(existingItem.id)}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Selector para añadir/cambiar recetas */}
                          <Select
                            onValueChange={(recipeId) => addRecipeToMenu(dayIndex, mealType, dishOrder, recipeId)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={existingItem ? "Cambiar receta" : "Añadir receta"} />
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
                      )
                    })}
                  </div>
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
