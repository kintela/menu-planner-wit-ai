"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
}

interface MenuItem {
  id: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: string
  dish_order: number
  recipes?: Recipe
}

interface WeeklyMenuViewProps {
  weeklyMenuId: number
}

const DAYS = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miércoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sábado" },
  { value: 6, label: "Domingo" },
]

const MEAL_TYPES = [
  { value: "lunch", label: "Comida", dishes: ["Primer plato", "Segundo plato"] },
  { value: "dinner", label: "Cena", dishes: ["Plato único"] },
]

// Funciones de mapeo entre componente y BD
const mapMealTypeToDb = (mealType: string): string => {
  const mapping: { [key: string]: string } = {
    lunch: "comida",
    dinner: "cena",
  }
  return mapping[mealType] || mealType
}

const mapMealTypeFromDb = (mealType: string): string => {
  const mapping: { [key: string]: string } = {
    comida: "lunch",
    cena: "dinner",
  }
  return mapping[mealType] || mealType
}

export function WeeklyMenuView({ weeklyMenuId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadDataForWeek()
  }, [weeklyMenuId])

  const loadDataForWeek = async () => {
    try {
      setLoading(true)
      console.log("🔄 Cargando datos para el menú semanal:", weeklyMenuId)

      // Cargar recetas disponibles
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, ingredients, preparation, image_url, calories")
        .order("name")

      if (recipesError) {
        console.error("Error cargando recetas:", recipesError)
        throw recipesError
      }

      console.log("✅ Recetas cargadas:", recipesData?.length || 0)
      setRecipes(recipesData || [])

      // Cargar items del menú existentes
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from("menu_items")
        .select(`
          id,
          weekly_menu_id,
          recipe_id,
          day_of_week,
          meal_type,
          dish_order,
          recipes (
            id,
            name,
            ingredients,
            preparation,
            image_url,
            calories
          )
        `)
        .eq("weekly_menu_id", weeklyMenuId)

      if (menuItemsError) {
        console.error("Error cargando items del menú:", menuItemsError)
        throw menuItemsError
      }

      console.log("✅ Items del menú cargados:", menuItemsData?.length || 0)
      console.log("📋 Items cargados desde BD:", menuItemsData)
      setMenuItems(menuItemsData || [])
    } catch (error) {
      console.error("❌ Error cargando datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del menú",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getMenuItemsForDayAndMeal = (dayOfWeek: number, mealType: string, dishOrder: number): MenuItem | null => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando item para día ${dayOfWeek}, comida ${mealType} (${dbMealType}), plato ${dishOrder}`)

    const item = menuItems.find(
      (item) => item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log("🎯 Item encontrado:", item)
    return item || null
  }

  const addRecipeToMenu = async (dayOfWeek: number, mealType: string, dishOrder: number, recipeId: number) => {
    try {
      console.log("➕ Añadiendo receta al menú:", { dayOfWeek, mealType, dishOrder, recipeId })

      const dbMealType = mapMealTypeToDb(mealType)
      console.log("🔄 Mapeando meal_type:", mealType, "→", dbMealType)

      // Verificar si ya existe un item para esta posición
      const existingItem = getMenuItemsForDayAndMeal(dayOfWeek, mealType, dishOrder)

      if (existingItem) {
        console.log("🔄 Actualizando item existente:", existingItem.id)

        const { data, error } = await supabase
          .from("menu_items")
          .update({ recipe_id: recipeId })
          .eq("id", existingItem.id)
          .select(`
            id,
            weekly_menu_id,
            recipe_id,
            day_of_week,
            meal_type,
            dish_order,
            recipes (
              id,
              name,
              ingredients,
              preparation,
              image_url,
              calories
            )
          `)

        if (error) {
          console.error("❌ Error actualizando item:", error)
          throw error
        }

        console.log("✅ Item actualizado:", data)
      } else {
        console.log("➕ Creando nuevo item")

        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            weekly_menu_id: weeklyMenuId,
            recipe_id: recipeId,
            day_of_week: dayOfWeek,
            meal_type: dbMealType,
            dish_order: dishOrder,
          })
          .select(`
            id,
            weekly_menu_id,
            recipe_id,
            day_of_week,
            meal_type,
            dish_order,
            recipes (
              id,
              name,
              ingredients,
              preparation,
              image_url,
              calories
            )
          `)

        if (error) {
          console.error("❌ Error insertando item:", error)
          throw error
        }

        console.log("✅ Item creado:", data)
      }

      // Recargar datos
      await loadDataForWeek()

      toast({
        title: "Éxito",
        description: "Receta añadida al menú correctamente",
      })
    } catch (error) {
      console.error("❌ Error añadiendo receta:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    }
  }

  const removeRecipeFromMenu = async (menuItemId: number) => {
    try {
      console.log("🗑️ Eliminando item del menú:", menuItemId)

      const { error } = await supabase.from("menu_items").delete().eq("id", menuItemId)

      if (error) {
        console.error("❌ Error eliminando item:", error)
        throw error
      }

      console.log("✅ Item eliminado correctamente")

      // Recargar datos
      await loadDataForWeek()

      toast({
        title: "Éxito",
        description: "Receta eliminada del menú correctamente",
      })
    } catch (error) {
      console.error("❌ Error eliminando receta:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    }
  }

  const getSelectStyle = (mealType: string, dishOrder: number) => {
    if (mealType === "lunch") {
      return dishOrder === 0
        ? "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-200" // Primer plato
        : "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200" // Segundo plato
    } else {
      return "border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200" // Cena
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando menú semanal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Planificador de Menú Semanal</h2>
        <p className="text-muted-foreground">Selecciona las recetas para cada día de la semana</p>
      </div>

      <div className="grid gap-4">
        {DAYS.map((day) => (
          <Card key={day.value} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 py-3">
              <CardTitle className="text-lg font-semibold text-center">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {MEAL_TYPES.map((mealType) => (
                  <div key={mealType.value} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {mealType.label}
                    </h4>
                    <div className="space-y-2">
                      {mealType.dishes.map((dishName, dishIndex) => {
                        const existingItem = getMenuItemsForDayAndMeal(day.value, mealType.value, dishIndex)
                        const selectedRecipeId = existingItem?.recipe_id?.toString() || "none"

                        return (
                          <div key={dishIndex} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">{dishName}</label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedRecipeId}
                                onValueChange={(value) => {
                                  if (value === "remove" && existingItem) {
                                    removeRecipeFromMenu(existingItem.id)
                                  } else if (value && value !== "remove") {
                                    addRecipeToMenu(day.value, mealType.value, dishIndex, Number.parseInt(value))
                                  }
                                }}
                              >
                                <SelectTrigger className={`h-9 text-sm ${getSelectStyle(mealType.value, dishIndex)}`}>
                                  <SelectValue placeholder="Añadir receta" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Añadir receta</SelectItem>
                                  {recipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))}
                                  {existingItem && (
                                    <SelectItem value="remove" className="text-red-600">
                                      🗑️ Eliminar receta
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
