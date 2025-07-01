"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
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
  { value: "lunch", label: "Comida", dbValue: "comida" },
  { value: "dinner", label: "Cena", dbValue: "cena" },
]

const DISH_ORDERS = [
  { value: 0, label: "Primer plato" },
  { value: 1, label: "Segundo plato" },
]

// Funciones de mapeo entre componente y BD
const mapMealTypeToDb = (mealType: string): string => {
  return mealType === "lunch" ? "comida" : "cena"
}

const mapMealTypeFromDb = (dbMealType: string): string => {
  return dbMealType === "comida" ? "lunch" : "dinner"
}

export default function WeeklyMenuView({ weeklyMenuId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Función para obtener items del menú para un día y comida específicos
  const getMenuItemsForDayAndMeal = (dayOfWeek: number, mealType: string, dishOrder: number): MenuItem | undefined => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando: día=${dayOfWeek}, meal_type=${dbMealType}, dish_order=${dishOrder}`)

    const items = menuItems.filter(
      (item) => item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Items encontrados:`, items)
    return items[0]
  }

  // Función para obtener el color del select según el tipo de comida y plato
  const getSelectClassName = (mealType: string, dishOrder: number): string => {
    if (mealType === "lunch") {
      return dishOrder === 0
        ? "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-200"
        : "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200"
    } else {
      return "border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200"
    }
  }

  const loadDataForWeek = async () => {
    try {
      console.log("🔄 Cargando datos para el menú semanal...")
      setLoading(true)

      // Cargar recetas
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, ingredients, preparation, calories")
        .order("name")

      if (recipesError) {
        console.error("❌ Error cargando recetas:", recipesError)
      } else {
        console.log(`✅ Cargadas ${recipesData?.length || 0} recetas`)
        setRecipes(recipesData || [])
      }

      // Cargar items del menú
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
            calories
          )
        `)
        .eq("weekly_menu_id", weeklyMenuId)

      if (menuError) {
        console.error("❌ Error cargando menú:", menuError)
      } else {
        console.log(`✅ Cargados ${menuData?.length || 0} items del menú:`, menuData)
        setMenuItems(menuData || [])
      }
    } catch (error) {
      console.error("❌ Error general:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (recipeId: number, dayOfWeek: number, mealType: string, dishOrder: number) => {
    try {
      console.log("🍽️ Añadiendo receta al menú:", { recipeId, dayOfWeek, mealType, dishOrder })

      const dbMealType = mapMealTypeToDb(mealType)
      console.log(`🔄 Mapeando ${mealType} → ${dbMealType}`)

      // Verificar si ya existe un item para esta posición
      const existingItem = getMenuItemsForDayAndMeal(dayOfWeek, mealType, dishOrder)

      if (existingItem) {
        console.log("🔄 Actualizando item existente:", existingItem.id)

        const { data, error } = await supabase
          .from("menu_items")
          .update({ recipe_id: recipeId })
          .eq("id", existingItem.id)
          .select()

        if (error) {
          console.error("❌ Error actualizando:", error)
          return
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
          .select()

        if (error) {
          console.error("❌ Error insertando:", error)
          return
        }

        console.log("✅ Item creado:", data)
      }

      // Recargar datos
      await loadDataForWeek()
    } catch (error) {
      console.error("❌ Error añadiendo receta:", error)
    }
  }

  useEffect(() => {
    loadDataForWeek()
  }, [weeklyMenuId])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg">Cargando planificador...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Planificador Semanal</h2>
        <p className="text-gray-600">Selecciona las recetas para cada día de la semana</p>
      </div>

      <div className="grid gap-6">
        {DAYS.map((day) => (
          <Card key={day.value} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-lg">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Comida - Primer plato */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Comida - Primer plato</label>
                  <Select
                    value={getMenuItemsForDayAndMeal(day.value, "lunch", 0)?.recipe_id?.toString() || ""}
                    onValueChange={(value) => {
                      if (value) {
                        addRecipeToMenu(Number.parseInt(value), day.value, "lunch", 0)
                      }
                    }}
                  >
                    <SelectTrigger className={getSelectClassName("lunch", 0)}>
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Comida - Segundo plato */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Comida - Segundo plato</label>
                  <Select
                    value={getMenuItemsForDayAndMeal(day.value, "lunch", 1)?.recipe_id?.toString() || ""}
                    onValueChange={(value) => {
                      if (value) {
                        addRecipeToMenu(Number.parseInt(value), day.value, "lunch", 1)
                      }
                    }}
                  >
                    <SelectTrigger className={getSelectClassName("lunch", 1)}>
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cena */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cena</label>
                  <Select
                    value={getMenuItemsForDayAndMeal(day.value, "dinner", 0)?.recipe_id?.toString() || ""}
                    onValueChange={(value) => {
                      if (value) {
                        addRecipeToMenu(Number.parseInt(value), day.value, "dinner", 0)
                      }
                    }}
                  >
                    <SelectTrigger className={getSelectClassName("dinner", 0)}>
                      <SelectValue placeholder="Añadir receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id.toString()}>
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
    </div>
  )
}
