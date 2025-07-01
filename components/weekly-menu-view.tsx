"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  recipes: Recipe
}

interface WeeklyMenuViewProps {
  weeklyMenuId: number
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch", label: "Comida", dishes: ["Primer plato", "Segundo plato"] },
  { key: "dinner", label: "Cena", dishes: ["Plato único"] },
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
  const supabase = createClient()

  const loadDataForWeek = async () => {
    try {
      console.log("🔄 Cargando datos para el menú semanal:", weeklyMenuId)

      // Cargar recetas disponibles
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, ingredients, preparation, image_url, calories")
        .order("name")

      if (recipesError) {
        console.error("Error cargando recetas:", recipesError)
        return
      }

      console.log(`📋 ${recipesData?.length || 0} recetas cargadas`)
      setRecipes(recipesData || [])

      // Cargar items del menú existentes
      const { data: menuData, error: menuError } = await supabase
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

      if (menuError) {
        console.error("Error cargando menú:", menuError)
        return
      }

      console.log(`🍽️ ${menuData?.length || 0} items del menú cargados`)
      console.log("Items cargados desde BD:", menuData)
      setMenuItems(menuData || [])
    } catch (error) {
      console.error("Error general:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (weeklyMenuId) {
      loadDataForWeek()
    }
  }, [weeklyMenuId])

  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: string, dishOrder: number): MenuItem | null => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando item para día ${dayIndex}, meal_type: ${dbMealType}, dish_order: ${dishOrder}`)

    const item = menuItems.find(
      (item) => item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log("Item encontrado:", item)
    return item || null
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: string, dishOrder: number, recipeId: number) => {
    try {
      console.log("➕ Añadiendo receta al menú:", { dayIndex, mealType, dishOrder, recipeId })

      const dbMealType = mapMealTypeToDb(mealType)
      console.log(`Mapeando ${mealType} → ${dbMealType}`)

      // Verificar si ya existe un item para esta posición
      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)

      if (existingItem) {
        console.log("🔄 Actualizando item existente:", existingItem.id)
        // Actualizar item existente
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
          console.error("Error actualizando item:", error)
          return
        }

        console.log("✅ Item actualizado:", data)
      } else {
        console.log("🆕 Creando nuevo item")
        // Crear nuevo item
        const { data, error } = await supabase
          .from("menu_items")
          .insert({
            weekly_menu_id: weeklyMenuId,
            recipe_id: recipeId,
            day_of_week: dayIndex,
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
          console.error("Error creando item:", error)
          return
        }

        console.log("✅ Item creado:", data)
      }

      // Recargar datos
      await loadDataForWeek()
    } catch (error) {
      console.error("Error en addRecipeToMenu:", error)
    }
  }

  const removeRecipeFromMenu = async (dayIndex: number, mealType: string, dishOrder: number) => {
    try {
      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)

      if (existingItem) {
        const { error } = await supabase.from("menu_items").delete().eq("id", existingItem.id)

        if (error) {
          console.error("Error eliminando item:", error)
          return
        }

        console.log("✅ Item eliminado")
        await loadDataForWeek()
      }
    } catch (error) {
      console.error("Error en removeRecipeFromMenu:", error)
    }
  }

  const getSelectStyle = (mealType: string, dishOrder: number) => {
    if (mealType === "lunch") {
      return dishOrder === 0
        ? "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
        : "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500"
    } else {
      return "border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-500"
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
        <p className="text-gray-600">Selecciona las recetas para cada día de la semana</p>
      </div>

      <div className="grid gap-4">
        {DAYS.map((day, dayIndex) => (
          <Card key={dayIndex} className="overflow-hidden">
            <CardHeader className="bg-gray-50 py-3">
              <CardTitle className="text-lg font-semibold text-center">{day}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-4">
                {MEAL_TYPES.map((mealType) => (
                  <div key={mealType.key} className="space-y-3">
                    <h4 className="font-medium text-gray-700 border-b pb-1">{mealType.label}</h4>
                    {mealType.dishes.map((dishName, dishIndex) => {
                      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType.key, dishIndex)
                      const selectStyle = getSelectStyle(mealType.key, dishIndex)

                      return (
                        <div key={dishIndex} className="space-y-2">
                          <label className="text-sm font-medium text-gray-600">{dishName}</label>
                          <Select
                            value={existingItem?.recipe_id?.toString() || "0"}
                            onValueChange={(value) => {
                              if (value === "0") {
                                removeRecipeFromMenu(dayIndex, mealType.key, dishIndex)
                              } else {
                                addRecipeToMenu(dayIndex, mealType.key, dishIndex, Number.parseInt(value))
                              }
                            }}
                          >
                            <SelectTrigger className={`w-full ${selectStyle}`}>
                              <SelectValue placeholder="Añadir receta" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Añadir receta</SelectItem>
                              {recipes.map((recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                  {recipe.name}
                                  {recipe.calories && ` (${recipe.calories} cal)`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
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
