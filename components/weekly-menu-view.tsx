"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Users, Flame, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  calories?: number
  prep_time?: number
  servings?: number
  image_url?: string
}

interface MenuItem {
  id?: string
  recipe_id: number | null
  recipe?: Recipe
}

interface DayMenu {
  comida: MenuItem[]
  cena: MenuItem[]
}

interface WeeklyMenu {
  [key: string]: DayMenu
}

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
]

const MEAL_TYPES = [
  { key: "comida", label: "Comida", color: "border-blue-300 bg-blue-50" },
  { key: "cena", label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export default function WeeklyMenuView() {
  const [menu, setMenu] = useState<WeeklyMenu>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Inicializar menú vacío
  useEffect(() => {
    const initialMenu: WeeklyMenu = {}
    DAYS.forEach((day) => {
      initialMenu[day.key] = {
        comida: [{ recipe_id: null }, { recipe_id: null }],
        cena: [{ recipe_id: null }],
      }
    })
    setMenu(initialMenu)
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, calories, prep_time, servings, image_url")
        .order("name")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error cargando recetas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: string, dishIndex: number, recipeId: number) => {
    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) return

    try {
      setSaving(true)
      const supabase = createClient()

      // Mapear mealType al valor de la base de datos
      const dbMealType = mealType === "comida" ? "lunch" : "dinner"

      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          weekly_menu_id: "default-menu",
          recipe_id: recipeId,
          day_of_week: DAYS.findIndex((d) => d.key === day),
          meal_type: dbMealType,
          dish_order: dishIndex,
        })
        .select()

      if (error) {
        console.error("Error guardando en base de datos:", error)
        throw error
      }

      console.log("✅ Receta guardada en base de datos:", data)

      // Actualizar estado local
      setMenu((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [mealType]: prev[day][mealType].map((item, index) =>
            index === dishIndex ? { ...item, recipe_id: recipeId, recipe } : item,
          ),
        },
      }))

      toast({
        title: "Receta añadida",
        description: `${recipe.name} añadida al ${mealType} del ${DAYS.find((d) => d.key === day)?.label}`,
      })
    } catch (error) {
      console.error("Error añadiendo receta:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const removeRecipeFromMenu = (day: string, mealType: string, dishIndex: number) => {
    setMenu((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: prev[day][mealType].map((item, index) =>
          index === dishIndex ? { recipe_id: null, recipe: undefined } : item,
        ),
      },
    }))

    toast({
      title: "Receta eliminada",
      description: "Receta eliminada del menú",
    })
  }

  const clearMenu = () => {
    const clearedMenu: WeeklyMenu = {}
    DAYS.forEach((day) => {
      clearedMenu[day.key] = {
        comida: [{ recipe_id: null }, { recipe_id: null }],
        cena: [{ recipe_id: null }],
      }
    })
    setMenu(clearedMenu)
    toast({
      title: "Menú limpiado",
      description: "Se ha limpiado todo el menú semanal",
    })
  }

  // Calcular estadísticas
  const getMenuStats = () => {
    let totalCalories = 0
    let totalDishes = 0
    let completedDays = 0

    DAYS.forEach((day) => {
      const dayMenu = menu[day.key]
      if (!dayMenu) return

      let dayDishes = 0
      let dayCalories = 0

      MEAL_TYPES.forEach((mealType) => {
        dayMenu[mealType.key]?.forEach((item) => {
          if (item.recipe) {
            totalDishes++
            dayDishes++
            if (item.recipe.calories) {
              totalCalories += item.recipe.calories
              dayCalories += item.recipe.calories
            }
          }
        })
      })

      if (dayDishes >= 2) completedDays++ // Al menos comida y cena
    })

    return {
      totalCalories,
      totalDishes,
      completedDays,
      avgCaloriesPerDay: totalDishes > 0 ? Math.round(totalCalories / 7) : 0,
    }
  }

  const stats = getMenuStats()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando planificador...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Planificador Semanal</h1>
          <p className="text-gray-600">Organiza tus comidas para toda la semana</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearMenu}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.completedDays}</div>
            <div className="text-sm text-gray-600">Días completos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalDishes}</div>
            <div className="text-sm text-gray-600">Platos planificados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalCalories}</div>
            <div className="text-sm text-gray-600">Calorías totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgCaloriesPerDay}</div>
            <div className="text-sm text-gray-600">Cal/día promedio</div>
          </CardContent>
        </Card>
      </div>

      {/* Planificador */}
      <div className="grid gap-6">
        {DAYS.map((day) => (
          <Card key={day.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {MEAL_TYPES.map((mealType) => (
                  <div key={mealType.key} className={`p-4 rounded-lg border-2 ${mealType.color}`}>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {mealType.key === "comida" ? <Users className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      {mealType.label}
                    </h4>
                    <div className="space-y-3">
                      {menu[day.key]?.[mealType.key]?.map((item, dishIndex) => (
                        <div key={dishIndex} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {mealType.key === "comida" ? `${dishIndex + 1}º Plato` : "Plato único"}
                            </span>
                            {item.recipe && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRecipeFromMenu(day.key, mealType.key, dishIndex)}
                              >
                                ×
                              </Button>
                            )}
                          </div>
                          {item.recipe ? (
                            <div className="bg-white p-3 rounded border">
                              <div className="flex items-center gap-3">
                                {item.recipe.image_url && (
                                  <img
                                    src={item.recipe.image_url || "/placeholder.svg"}
                                    alt={item.recipe.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <h5 className="font-medium">{item.recipe.name}</h5>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                    {item.recipe.calories && (
                                      <span className="flex items-center gap-1">
                                        <Flame className="h-3 w-3" />
                                        {item.recipe.calories} cal
                                      </span>
                                    )}
                                    {item.recipe.prep_time && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {item.recipe.prep_time} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Select
                              onValueChange={(value) =>
                                addRecipeToMenu(day.key, mealType.key, dishIndex, Number.parseInt(value))
                              }
                              disabled={saving}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar receta..." />
                              </SelectTrigger>
                              <SelectContent>
                                {recipes.map((recipe) => (
                                  <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                    <div className="flex items-center gap-2">
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
                          )}
                        </div>
                      ))}
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
