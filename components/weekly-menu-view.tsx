"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  calories: number | null
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
  { key: "lunch", label: "Comida", dishes: [1, 2] },
  { key: "dinner", label: "Cena", dishes: [1] },
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

// Función para obtener el color del select según el tipo de comida y plato
const getSelectStyle = (mealType: string, dishOrder: number) => {
  if (mealType === "lunch") {
    if (dishOrder === 1) {
      return "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
    } else {
      return "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500"
    }
  } else if (mealType === "dinner") {
    return "border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-500"
  }
  return ""
}

export function WeeklyMenuView({ weeklyMenuId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

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
      } else {
        setRecipes(recipesData || [])
        console.log("✅ Recetas cargadas:", recipesData?.length || 0)
      }

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
        console.error("Error cargando items del menú:", menuError)
      } else {
        console.log("📋 Items del menú cargados desde BD:", menuData)
        const processedItems = (menuData || []).map((item) => ({
          ...item,
          recipe: item.recipes,
        }))
        setMenuItems(processedItems)
        console.log("✅ Items del menú procesados:", processedItems.length)
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: string, dishOrder: number): MenuItem[] => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando items para día ${dayIndex}, meal_type: ${dbMealType}, dish_order: ${dishOrder}`)

    const items = menuItems.filter(
      (item) => item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Items encontrados:`, items)
    return items
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: string, dishOrder: number, recipeId: number) => {
    try {
      console.log("➕ Añadiendo receta al menú:", { dayIndex, mealType, dishOrder, recipeId })

      const dbMealType = mapMealTypeToDb(mealType)
      console.log("🔄 Mapeando meal_type:", mealType, "→", dbMealType)

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
        console.error("❌ Error añadiendo receta:", error)
        throw error
      }

      console.log("✅ Receta añadida exitosamente:", data)

      // Actualizar estado local
      if (data && data[0]) {
        const newItem = {
          ...data[0],
          recipe: data[0].recipes,
        }
        setMenuItems((prev) => [...prev, newItem])
        console.log("🔄 Estado local actualizado")
      }

      // Recargar datos para asegurar consistencia
      await loadDataForWeek()
    } catch (error) {
      console.error("❌ Error en addRecipeToMenu:", error)
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

      console.log("✅ Item eliminado exitosamente")

      // Actualizar estado local
      setMenuItems((prev) => prev.filter((item) => item.id !== menuItemId))
    } catch (error) {
      console.error("❌ Error en removeRecipeFromMenu:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando planificador semanal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Planificador Semanal</h2>
        <p className="text-muted-foreground">Organiza tus comidas para toda la semana</p>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day, dayIndex) => (
          <Card key={dayIndex} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-sm font-medium">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEALS.map((meal) => (
                <div key={meal.key} className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{meal.label}</h4>
                  {meal.dishes.map((dishOrder) => {
                    const existingItems = getMenuItemsForDayAndMeal(dayIndex, meal.key, dishOrder)
                    const selectedRecipe = existingItems[0]?.recipe

                    return (
                      <div key={`${meal.key}-${dishOrder}`} className="space-y-1">
                        {meal.key === "lunch" && dishOrder === 2 && (
                          <div className="text-xs text-muted-foreground">2º plato</div>
                        )}

                        <Select
                          value={selectedRecipe ? selectedRecipe.id.toString() : "default"}
                          onValueChange={(value) => {
                            if (value === "default") {
                              // Eliminar receta
                              if (existingItems[0]) {
                                removeRecipeFromMenu(existingItems[0].id)
                              }
                            } else {
                              // Añadir nueva receta
                              const recipeId = Number.parseInt(value)
                              if (existingItems[0]) {
                                // Primero eliminar la existente
                                removeRecipeFromMenu(existingItems[0].id).then(() => {
                                  addRecipeToMenu(dayIndex, meal.key, dishOrder, recipeId)
                                })
                              } else {
                                addRecipeToMenu(dayIndex, meal.key, dishOrder, recipeId)
                              }
                            }
                          }}
                        >
                          <SelectTrigger className={`h-8 text-xs ${getSelectStyle(meal.key, dishOrder)}`}>
                            <SelectValue placeholder="Añadir receta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Añadir receta</SelectItem>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{recipe.name}</span>
                                  {recipe.calories && (
                                    <span className="text-xs text-muted-foreground">{recipe.calories} cal</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-300 bg-blue-50 rounded"></div>
          <span>Primer plato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green-300 bg-green-50 rounded"></div>
          <span>Segundo plato</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-orange-300 bg-orange-50 rounded"></div>
          <span>Cena</span>
        </div>
      </div>
    </div>
  )
}
