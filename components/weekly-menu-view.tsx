"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  weeklyMenuId: number
}

// Mapeo de tipos de comida
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
  const [currentWeek, setCurrentWeek] = useState(0)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  useEffect(() => {
    loadDataForWeek()
  }, [weeklyMenuId, currentWeek])

  const loadDataForWeek = async () => {
    try {
      setLoading(true)
      console.log("🔄 Cargando datos para la semana...")

      // Cargar recetas disponibles
      const recipesResponse = await fetch("/api/recipes")
      if (recipesResponse.ok) {
        const recipesData = await recipesResponse.json()
        setRecipes(recipesData.recipes || [])
        console.log(`📋 ${recipesData.recipes?.length || 0} recetas cargadas`)
      }

      // Cargar items del menú existentes
      const menuResponse = await fetch(`/api/weekly-menus/${weeklyMenuId}/items`)
      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        setMenuItems(menuData.items || [])
        console.log(`🍽️ ${menuData.items?.length || 0} items del menú cargados`)
        console.log("Items cargados desde BD:", menuData.items)
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: string, dishOrder = 1): MenuItem[] => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando items para día ${dayIndex}, meal_type: ${dbMealType}, dish_order: ${dishOrder}`)

    const items = menuItems.filter(
      (item) => item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Encontrados ${items.length} items:`, items)
    return items
  }

  const addRecipeToMenu = async (dayIndex: number, mealType: string, recipeId: number, dishOrder = 1) => {
    try {
      console.log(
        `➕ Añadiendo receta ${recipeId} al día ${dayIndex}, meal_type: ${mealType}, dish_order: ${dishOrder}`,
      )

      const dbMealType = mapMealTypeToDb(mealType)
      console.log(`🔄 Mapeando ${mealType} → ${dbMealType}`)

      const response = await fetch(`/api/weekly-menus/${weeklyMenuId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe_id: recipeId,
          day_of_week: dayIndex,
          meal_type: dbMealType,
          dish_order: dishOrder,
        }),
      })

      if (response.ok) {
        console.log("✅ Receta añadida exitosamente")
        await loadDataForWeek() // Recargar datos
      } else {
        const errorData = await response.json()
        console.error("❌ Error añadiendo receta:", errorData)
      }
    } catch (error) {
      console.error("❌ Error en addRecipeToMenu:", error)
    }
  }

  const removeRecipeFromMenu = async (itemId: number) => {
    try {
      console.log(`🗑️ Eliminando item ${itemId}`)

      const response = await fetch(`/api/weekly-menus/${weeklyMenuId}/items/${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        console.log("✅ Item eliminado exitosamente")
        await loadDataForWeek() // Recargar datos
      } else {
        console.error("❌ Error eliminando item")
      }
    } catch (error) {
      console.error("❌ Error en removeRecipeFromMenu:", error)
    }
  }

  const getSelectStyle = (mealType: string, dishOrder: number) => {
    if (mealType === "lunch" && dishOrder === 1) {
      return "border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-500"
    }
    if (mealType === "lunch" && dishOrder === 2) {
      return "border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-500"
    }
    if (mealType === "dinner") {
      return "border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-500"
    }
    return ""
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
      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">Semana {currentWeek + 1} - Menú Semanal</h2>
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(currentWeek + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {daysOfWeek.map((day, dayIndex) => (
          <Card key={dayIndex} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comida - Primer Plato */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-blue-700">Comida - Primer Plato</h4>
                <Select
                  value={getMenuItemsForDayAndMeal(dayIndex, "lunch", 1)[0]?.recipe_id?.toString() || "add-recipe"}
                  onValueChange={(value) => {
                    if (value !== "add-recipe") {
                      addRecipeToMenu(dayIndex, "lunch", Number.parseInt(value), 1)
                    }
                  }}
                >
                  <SelectTrigger className={`w-full ${getSelectStyle("lunch", 1)}`}>
                    <SelectValue placeholder="Añadir receta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add-recipe">Añadir receta</SelectItem>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id.toString()}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comida - Segundo Plato */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-green-700">Comida - Segundo Plato</h4>
                <Select
                  value={getMenuItemsForDayAndMeal(dayIndex, "lunch", 2)[0]?.recipe_id?.toString() || "add-recipe"}
                  onValueChange={(value) => {
                    if (value !== "add-recipe") {
                      addRecipeToMenu(dayIndex, "lunch", Number.parseInt(value), 2)
                    }
                  }}
                >
                  <SelectTrigger className={`w-full ${getSelectStyle("lunch", 2)}`}>
                    <SelectValue placeholder="Añadir receta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add-recipe">Añadir receta</SelectItem>
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
                <h4 className="font-medium text-sm text-orange-700">Cena</h4>
                <Select
                  value={getMenuItemsForDayAndMeal(dayIndex, "dinner", 1)[0]?.recipe_id?.toString() || "add-recipe"}
                  onValueChange={(value) => {
                    if (value !== "add-recipe") {
                      addRecipeToMenu(dayIndex, "dinner", Number.parseInt(value), 1)
                    }
                  }}
                >
                  <SelectTrigger className={`w-full ${getSelectStyle("dinner", 1)}`}>
                    <SelectValue placeholder="Añadir receta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add-recipe">Añadir receta</SelectItem>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id.toString()}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
