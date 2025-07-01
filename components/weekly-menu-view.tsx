"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Calendar, TrendingUp, Target } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  calories?: number
  categories?: { id: number; name: string }[]
}

interface MenuEntry {
  id?: number
  day: string
  meal_type: string
  recipe_id: number
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  recipes: Recipe[]
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch", label: "Comida", color: "bg-blue-50 border-blue-300" },
  { key: "lunch_second", label: "2º Plato", color: "bg-green-50 border-green-300" },
  { key: "dinner", label: "Cena", color: "bg-orange-50 border-orange-300" },
]

export default function WeeklyMenuView({ recipes }: WeeklyMenuViewProps) {
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Cargar menú existente
  useEffect(() => {
    loadWeeklyMenu()
  }, [])

  const loadWeeklyMenu = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_menu")
        .select(`
          *,
          recipes (
            id,
            name,
            calories
          )
        `)
        .order("day")

      if (error) {
        console.error("Error cargando menú:", error)
        return
      }

      setMenuEntries(data || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: string, recipeId: number) => {
    try {
      // Mapear meal_type al valor de la base de datos
      const dbMealType = mealType === "lunch" ? "comida" : mealType === "dinner" ? "cena" : mealType

      const { data, error } = await supabase
        .from("weekly_menu")
        .insert({
          day,
          meal_type: dbMealType,
          recipe_id: recipeId,
        })
        .select()

      if (error) {
        console.error("Error añadiendo receta:", error)
        return
      }

      // Actualizar estado local
      const recipe = recipes.find((r) => r.id === recipeId)
      if (recipe && data) {
        setMenuEntries((prev) => [
          ...prev,
          {
            ...data[0],
            recipe,
          },
        ])
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const removeRecipeFromMenu = async (entryId: number) => {
    try {
      const { error } = await supabase.from("weekly_menu").delete().eq("id", entryId)

      if (error) {
        console.error("Error eliminando receta:", error)
        return
      }

      setMenuEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const getMenuEntry = (day: string, mealType: string) => {
    const dbMealType = mealType === "lunch" ? "comida" : mealType === "dinner" ? "cena" : mealType
    return menuEntries.find((entry) => entry.day === day && entry.meal_type === dbMealType)
  }

  // Calcular estadísticas
  const totalCalories = menuEntries.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0)
  const averageCaloriesPerDay = Math.round(totalCalories / 7)
  const completedDays = DAYS.filter((day) => MEAL_TYPES.some((mealType) => getMenuEntry(day, mealType.key))).length

  if (loading) {
    return <div className="text-center py-8">Cargando menú semanal...</div>
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-blue-600">{totalCalories}</span>
            </div>
            <p className="text-sm text-gray-600">Calorías totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-2xl font-bold text-green-600">{averageCaloriesPerDay}</span>
            </div>
            <p className="text-sm text-gray-600">Promedio por día</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-2xl font-bold text-purple-600">{completedDays}/7</span>
            </div>
            <p className="text-sm text-gray-600">Días completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Planificador semanal */}
      <div className="grid gap-4">
        {DAYS.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-lg">{day}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {MEAL_TYPES.map((mealType) => {
                  const entry = getMenuEntry(day, mealType.key)
                  return (
                    <div key={`${day}-${mealType.key}`} className={`p-3 rounded-lg border-2 ${mealType.color}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{mealType.label}</Badge>
                        {entry && (
                          <Button variant="ghost" size="sm" onClick={() => entry.id && removeRecipeFromMenu(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {entry ? (
                        <div>
                          <h4 className="font-medium">{entry.recipe?.name}</h4>
                          {entry.recipe?.calories && (
                            <p className="text-sm text-gray-600">{entry.recipe.calories} calorías</p>
                          )}
                        </div>
                      ) : (
                        <Select onValueChange={(value) => addRecipeToMenu(day, mealType.key, Number.parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar receta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                {recipe.name}
                                {recipe.calories && ` (${recipe.calories} cal)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
