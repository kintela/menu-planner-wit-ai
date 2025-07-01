"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChefHat, Utensils } from "lucide-react"

interface Recipe {
  id: number
  name: string
  ingredients?: string
  preparation?: string
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

const DAYS = [
  { id: 0, name: "Domingo", short: "Dom" },
  { id: 1, name: "Lunes", short: "Lun" },
  { id: 2, name: "Martes", short: "Mar" },
  { id: 3, name: "Miércoles", short: "Mié" },
  { id: 4, name: "Jueves", short: "Jue" },
  { id: 5, name: "Viernes", short: "Vie" },
  { id: 6, name: "Sábado", short: "Sáb" },
]

const MEAL_TYPES = [
  { id: "lunch", name: "Comida", dishes: [1, 2] },
  { id: "dinner", name: "Cena", dishes: [1] },
]

// Mock data para v0
const mockRecipes: Recipe[] = [
  { id: 1, name: "Paella Valenciana", calories: 450 },
  { id: 2, name: "Tortilla Española", calories: 320 },
  { id: 3, name: "Gazpacho Andaluz", calories: 180 },
  { id: 4, name: "Cocido Madrileño", calories: 650 },
  { id: 5, name: "Crema Catalana", calories: 280 },
]

// Función para mapear meal_type del componente a la BD
const mapMealTypeToDb = (mealType: string): string => {
  const mapping: { [key: string]: string } = {
    lunch: "comida",
    dinner: "cena",
  }
  return mapping[mealType] || mealType
}

// Función para mapear meal_type de la BD al componente
const mapMealTypeFromDb = (mealType: string): string => {
  const mapping: { [key: string]: string } = {
    comida: "lunch",
    cena: "dinner",
  }
  return mapping[mealType] || mealType
}

export function WeeklyMenuView({ weeklyMenuId }: WeeklyMenuViewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes)
  const [loading, setLoading] = useState(true)

  // Función para obtener items del menú para un día y comida específicos
  const getMenuItemsForDayAndMeal = (dayOfWeek: number, mealType: string, dishOrder = 1): MenuItem | null => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando: día=${dayOfWeek}, meal_type=${dbMealType}, dish_order=${dishOrder}`)

    const item = menuItems.find(
      (item) => item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Encontrado:`, item)
    return item || null
  }

  // Función para cargar datos
  const loadDataForWeek = async () => {
    try {
      console.log("🚀 Cargando datos del menú semanal...")
      setLoading(true)

      // En v0, simulamos datos
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Simular algunos items del menú
      const mockMenuItems: MenuItem[] = [
        {
          id: 1,
          weekly_menu_id: weeklyMenuId,
          recipe_id: 1,
          day_of_week: 1,
          meal_type: "comida",
          dish_order: 1,
          recipe: mockRecipes[0],
        },
        {
          id: 2,
          weekly_menu_id: weeklyMenuId,
          recipe_id: 2,
          day_of_week: 1,
          meal_type: "comida",
          dish_order: 2,
          recipe: mockRecipes[1],
        },
        {
          id: 3,
          weekly_menu_id: weeklyMenuId,
          recipe_id: 3,
          day_of_week: 1,
          meal_type: "cena",
          dish_order: 1,
          recipe: mockRecipes[2],
        },
      ]

      console.log("📋 Items cargados desde BD:", mockMenuItems)
      setMenuItems(mockMenuItems)
    } catch (error) {
      console.error("❌ Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  // Función para añadir receta al menú
  const addRecipeToMenu = async (recipeId: number, dayOfWeek: number, mealType: string, dishOrder = 1) => {
    try {
      const dbMealType = mapMealTypeToDb(mealType)
      console.log(`➕ Añadiendo receta: ${recipeId} para ${dbMealType} día ${dayOfWeek} plato ${dishOrder}`)

      // En v0, simulamos la adición
      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) {
        console.error("❌ Receta no encontrada")
        return
      }

      const newMenuItem: MenuItem = {
        id: Date.now(), // ID temporal
        weekly_menu_id: weeklyMenuId,
        recipe_id: recipeId,
        day_of_week: dayOfWeek,
        meal_type: dbMealType,
        dish_order: dishOrder,
        recipe,
      }

      // Actualizar estado local
      setMenuItems((prev) => {
        const filtered = prev.filter(
          (item) => !(item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder),
        )
        return [...filtered, newMenuItem]
      })

      console.log("✅ Receta añadida al menú")
    } catch (error) {
      console.error("❌ Error añadiendo receta:", error)
    }
  }

  // Función para obtener color según meal_type y dish_order
  const getSelectColor = (mealType: string, dishOrder: number): string => {
    if (mealType === "lunch") {
      return dishOrder === 1 ? "border-blue-300 bg-blue-50" : "border-green-300 bg-green-50"
    }
    return "border-orange-300 bg-orange-50"
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDataForWeek()
  }, [weeklyMenuId])

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
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Planificador de Menú Semanal</h1>
        <p className="text-muted-foreground">Organiza tus comidas para toda la semana</p>
      </div>

      {/* Grid del menú semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <Card key={day.id} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-sm font-medium flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                {day.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TYPES.map((mealType) => (
                <div key={mealType.id} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="h-4 w-4" />
                    <span className="font-medium text-sm">{mealType.name}</span>
                  </div>

                  {mealType.dishes.map((dishOrder) => {
                    const menuItem = getMenuItemsForDayAndMeal(day.id, mealType.id, dishOrder)
                    const dishLabel = mealType.id === "lunch" ? (dishOrder === 1 ? "1º" : "2º") : ""

                    return (
                      <div key={`${mealType.id}-${dishOrder}`} className="space-y-1">
                        {dishLabel && <div className="text-xs text-muted-foreground">{dishLabel} plato</div>}

                        <Select
                          value={menuItem?.recipe_id?.toString() || "default"}
                          onValueChange={(value) => {
                            if (value) {
                              addRecipeToMenu(Number.parseInt(value), day.id, mealType.id, dishOrder)
                            }
                          }}
                        >
                          <SelectTrigger
                            className={`w-full text-xs ${getSelectColor(mealType.id, dishOrder)}`}
                            size="sm"
                          >
                            <SelectValue placeholder="Añadir receta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Añadir receta</SelectItem>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <ChefHat className="h-3 w-3" />
                                  <span>{recipe.name}</span>
                                  {recipe.calories && (
                                    <Badge variant="outline" className="text-xs">
                                      {recipe.calories} cal
                                    </Badge>
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

      {/* Información sobre el entorno v0 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">ℹ️</span>
          <div>
            <p className="text-blue-800 font-medium">Entorno de desarrollo v0</p>
            <p className="text-blue-700 text-sm">
              En producción, este planificador se conectará a tu base de datos Supabase y guardará automáticamente las
              selecciones en la tabla menu_items.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
