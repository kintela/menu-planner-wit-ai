"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChefHat, Clock, Users } from "lucide-react"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated: boolean
  video_url?: string
  source_url?: string
  created_at: string
}

interface MenuItem {
  id?: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: "comida" | "cena"
  dish_order: number
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  recipes: Recipe[]
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
  { id: "lunch", name: "Comida", dbValue: "comida" },
  { id: "dinner", name: "Cena", dbValue: "cena" },
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

export default function WeeklyMenuView({ recipes, weeklyMenuId }: WeeklyMenuViewProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar items del menú existentes
  useEffect(() => {
    loadMenuItems()
  }, [weeklyMenuId])

  const loadMenuItems = async () => {
    try {
      setLoading(true)
      // En v0, usar datos mock
      const mockMenuItems: MenuItem[] = [
        {
          id: 1,
          weekly_menu_id: weeklyMenuId,
          recipe_id: 1,
          day_of_week: 1,
          meal_type: "comida",
          dish_order: 0,
          recipe: recipes[0],
        },
        {
          id: 2,
          weekly_menu_id: weeklyMenuId,
          recipe_id: 2,
          day_of_week: 1,
          meal_type: "cena",
          dish_order: 0,
          recipe: recipes[1],
        },
      ]

      setMenuItems(mockMenuItems)
      console.log("✅ Items del menú cargados:", mockMenuItems.length)
    } catch (error) {
      console.error("❌ Error cargando items del menú:", error)
      setMenuItems([])
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener items de un día y comida específicos
  const getMenuItemsForDayAndMeal = (dayOfWeek: number, mealType: string, dishOrder = 0): MenuItem[] => {
    const dbMealType = mapMealTypeToDb(mealType)
    console.log(`🔍 Buscando items para día ${dayOfWeek}, comida ${mealType} (${dbMealType}), plato ${dishOrder}`)

    const items = menuItems.filter(
      (item) => item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(`📋 Items encontrados:`, items)
    return items
  }

  // Función para añadir/actualizar receta en el menú
  const addRecipeToMenu = async (dayOfWeek: number, mealType: string, dishOrder: number, recipeId: number | null) => {
    try {
      const dbMealType = mapMealTypeToDb(mealType)
      console.log(
        `🍽️ Añadiendo receta ${recipeId} para día ${dayOfWeek}, comida ${mealType} (${dbMealType}), plato ${dishOrder}`,
      )

      if (recipeId === null) {
        // Eliminar item existente
        setMenuItems((prev) =>
          prev.filter(
            (item) =>
              !(item.day_of_week === dayOfWeek && item.meal_type === dbMealType && item.dish_order === dishOrder),
          ),
        )
        console.log("🗑️ Item eliminado del menú")
        return
      }

      const recipe = recipes.find((r) => r.id === recipeId)
      if (!recipe) {
        console.error("❌ Receta no encontrada:", recipeId)
        return
      }

      const newItem: MenuItem = {
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
        return [...filtered, newItem]
      })

      console.log("✅ Receta añadida al menú automáticamente")
    } catch (error) {
      console.error("❌ Error añadiendo receta al menú:", error)
    }
  }

  // Función para obtener el color del borde según el tipo de comida y plato
  const getBorderColor = (mealType: string, dishOrder: number): string => {
    if (mealType === "lunch") {
      return dishOrder === 0 ? "border-blue-300 bg-blue-50" : "border-green-300 bg-green-50"
    } else if (mealType === "dinner") {
      return "border-orange-300 bg-orange-50"
    }
    return "border-gray-300 bg-gray-50"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
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
        <p className="text-gray-600">Organiza tus comidas para toda la semana</p>
      </div>

      {/* Grid del menú semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <Card key={day.id} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {day.name}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comida */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-blue-700 flex items-center gap-1">
                  <ChefHat className="h-3 w-3" />
                  Comida
                </h4>

                {/* Primer plato */}
                <div className={`p-2 rounded-lg border-2 ${getBorderColor("lunch", 0)}`}>
                  <p className="text-xs font-medium mb-1">Primer plato</p>
                  <RecipeSelector
                    recipes={recipes}
                    selectedRecipe={getMenuItemsForDayAndMeal(day.id, "lunch", 0)[0]?.recipe || null}
                    onRecipeChange={(recipeId) => addRecipeToMenu(day.id, "lunch", 0, recipeId)}
                    placeholder="Añadir primer plato"
                  />
                </div>

                {/* Segundo plato */}
                <div className={`p-2 rounded-lg border-2 ${getBorderColor("lunch", 1)}`}>
                  <p className="text-xs font-medium mb-1">Segundo plato</p>
                  <RecipeSelector
                    recipes={recipes}
                    selectedRecipe={getMenuItemsForDayAndMeal(day.id, "lunch", 1)[0]?.recipe || null}
                    onRecipeChange={(recipeId) => addRecipeToMenu(day.id, "lunch", 1, recipeId)}
                    placeholder="Añadir segundo plato"
                  />
                </div>
              </div>

              {/* Cena */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-orange-700 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Cena
                </h4>

                <div className={`p-2 rounded-lg border-2 ${getBorderColor("dinner", 0)}`}>
                  <RecipeSelector
                    recipes={recipes}
                    selectedRecipe={getMenuItemsForDayAndMeal(day.id, "dinner", 0)[0]?.recipe || null}
                    onRecipeChange={(recipeId) => addRecipeToMenu(day.id, "dinner", 0, recipeId)}
                    placeholder="Añadir cena"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Menú</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{menuItems.length}</div>
              <div className="text-sm text-gray-600">Platos planificados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {new Set(menuItems.map((item) => item.recipe_id)).size}
              </div>
              <div className="text-sm text-gray-600">Recetas únicas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(
                  menuItems.reduce((sum, item) => sum + (item.recipe?.calories || 0), 0) / menuItems.length || 0,
                )}
              </div>
              <div className="text-sm text-gray-600">Calorías promedio</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente selector de recetas
interface RecipeSelectorProps {
  recipes: Recipe[]
  selectedRecipe: Recipe | null
  onRecipeChange: (recipeId: number | null) => void
  placeholder: string
}

function RecipeSelector({ recipes, selectedRecipe, onRecipeChange, placeholder }: RecipeSelectorProps) {
  return (
    <Select
      value={selectedRecipe?.id.toString() || "default"}
      onValueChange={(value) => onRecipeChange(value ? Number.parseInt(value) : null)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Seleccionar receta</SelectItem>
        {recipes.map((recipe) => (
          <SelectItem key={recipe.id} value={recipe.id.toString()}>
            <div className="flex items-center gap-2">
              <span>{recipe.name}</span>
              {recipe.is_ai_generated && (
                <Badge variant="secondary" className="text-xs">
                  AI
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
