"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"
import { useSession } from "@/components/providers/session-wrapper"

interface Recipe {
  id: number
  title: string
  category: string
}

interface MenuItem {
  id: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: string
  dish_order: number
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  weeklyMenuId: number
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const MEALS = [
  { key: "lunch", label: "Comida", dishes: ["Primer plato", "Segundo plato"] },
  { key: "dinner", label: "Cena", dishes: ["Plato único"] },
]

// Mapeo entre valores del componente y valores de la BD
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

export default function WeeklyMenuView({ weeklyMenuId }: WeeklyMenuViewProps) {
  const { user } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Función para obtener items del menú para un día, comida y plato específicos
  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: string, dishOrder: number): MenuItem | undefined => {
    const dbMealType = mapMealTypeToDb(mealType)

    console.log(`🔍 Buscando item para día ${dayIndex}, meal_type: ${dbMealType}, dish_order: ${dishOrder}`)

    const item = menuItems.find(
      (item) => item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Item encontrado:`, item)
    return item
  }

  // Función para obtener el color del borde según el tipo de comida y plato
  const getBorderColor = (mealType: string, dishOrder: number): string => {
    if (mealType === "lunch") {
      return dishOrder === 0 ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-green-500"
    } else {
      return "border-l-4 border-l-orange-500"
    }
  }

  const loadDataForWeek = async () => {
    try {
      setLoading(true)

      // Cargar recetas
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, title, category")
        .order("title")

      if (recipesError) {
        console.error("Error loading recipes:", recipesError)
        return
      }

      console.log("📚 Recetas cargadas:", recipesData?.length || 0)
      setRecipes(recipesData || [])

      // Cargar items del menú con recetas
      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select(`
          id,
          weekly_menu_id,
          recipe_id,
          day_of_week,
          meal_type,
          dish_order,
          recipe:recipes(id, title, category)
        `)
        .eq("weekly_menu_id", weeklyMenuId)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (menuError) {
        console.error("Error loading menu items:", menuError)
        return
      }

      console.log("🍽️ Items del menú cargados:", menuData)
      setMenuItems(menuData || [])
    } catch (error) {
      console.error("Error in loadDataForWeek:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: string, dishOrder: number, recipeId: number) => {
    if (!user) return

    try {
      const dbMealType = mapMealTypeToDb(mealType)

      console.log(
        `➕ Añadiendo receta ${recipeId} para día ${dayIndex}, meal_type: ${dbMealType}, dish_order: ${dishOrder}`,
      )

      // Verificar si ya existe un item para esta posición
      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)

      if (existingItem) {
        // Actualizar item existente
        const { error } = await supabase.from("menu_items").update({ recipe_id: recipeId }).eq("id", existingItem.id)

        if (error) {
          console.error("Error updating menu item:", error)
          return
        }

        console.log("✅ Item actualizado correctamente")
      } else {
        // Crear nuevo item
        const { error } = await supabase.from("menu_items").insert({
          weekly_menu_id: weeklyMenuId,
          recipe_id: recipeId,
          day_of_week: dayIndex,
          meal_type: dbMealType,
          dish_order: dishOrder,
          user_id: user.id,
        })

        if (error) {
          console.error("Error inserting menu item:", error)
          return
        }

        console.log("✅ Item creado correctamente")
      }

      // Recargar datos
      await loadDataForWeek()
    } catch (error) {
      console.error("Error in addRecipeToMenu:", error)
    }
  }

  useEffect(() => {
    loadDataForWeek()
  }, [weeklyMenuId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Cargando menú semanal...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Planificador de Menú Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header con días de la semana */}
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="font-semibold text-center p-2"></div>
                {DAYS.map((day) => (
                  <div key={day} className="font-semibold text-center p-2 bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
              </div>

              {/* Filas para cada comida y plato */}
              {MEALS.map((meal) =>
                meal.dishes.map((dish, dishIndex) => (
                  <div key={`${meal.key}-${dishIndex}`} className="grid grid-cols-8 gap-2 mb-2">
                    <div className="font-medium text-sm p-2 bg-gray-100 rounded flex items-center">
                      {meal.label} ({dish})
                    </div>
                    {DAYS.map((_, dayIndex) => {
                      const menuItem = getMenuItemsForDayAndMeal(dayIndex, meal.key, dishIndex)
                      const selectedRecipe = menuItem?.recipe
                      const borderColor = getBorderColor(meal.key, dishIndex)

                      return (
                        <div key={dayIndex} className={`${borderColor} bg-white rounded p-1`}>
                          <Select
                            value={selectedRecipe ? selectedRecipe.id.toString() : "0"}
                            onValueChange={(value) => {
                              if (value) {
                                addRecipeToMenu(dayIndex, meal.key, dishIndex, Number.parseInt(value))
                              }
                            }}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Añadir receta" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Añadir receta</SelectItem>
                              {recipes.map((recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                  {recipe.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                )),
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
