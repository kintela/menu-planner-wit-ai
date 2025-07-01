"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChefHat, Trash2, BarChart3 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
}

interface MenuEntry {
  id?: number
  day: string
  meal_type: string
  recipe_id: number
  recipe?: Recipe
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { value: "lunch", label: "Comida", color: "bg-blue-50 border-blue-300" },
  { value: "dinner", label: "Cena", color: "bg-orange-50 border-orange-300" },
]

export function WeeklyMenuView() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Cargar recetas
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, calories, image_url")
        .order("name")

      if (recipesError) throw recipesError

      // Cargar entradas del menú
      const { data: menuData, error: menuError } = await supabase.from("weekly_menu").select(`
          id,
          day,
          meal_type,
          recipe_id,
          recipes (id, name, calories, image_url)
        `)

      if (menuError) throw menuError

      setRecipes(recipesData || [])
      setMenuEntries(
        (menuData || []).map((entry: any) => ({
          id: entry.id,
          day: entry.day,
          meal_type: entry.meal_type,
          recipe_id: entry.recipe_id,
          recipe: entry.recipes,
        })),
      )
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: string, recipeId: number) => {
    try {
      // Mapear tipos de comida al español para la base de datos
      const mealTypeMapping: Record<string, string> = {
        lunch: "comida",
        dinner: "cena",
      }

      const dbMealType = mealTypeMapping[mealType] || mealType

      console.log(`Añadiendo receta ${recipeId} para ${day} - ${dbMealType}`)

      const { data, error } = await supabase
        .from("weekly_menu")
        .insert({
          day,
          meal_type: dbMealType,
          recipe_id: recipeId,
        })
        .select(`
          id,
          day,
          meal_type,
          recipe_id,
          recipes (id, name, calories, image_url)
        `)

      if (error) {
        console.error("Error insertando en base de datos:", error)
        throw error
      }

      console.log("Receta añadida exitosamente:", data)

      // Actualizar estado local
      if (data && data[0]) {
        const newEntry: MenuEntry = {
          id: data[0].id,
          day: data[0].day,
          meal_type: data[0].meal_type,
          recipe_id: data[0].recipe_id,
          recipe: data[0].recipes,
        }
        setMenuEntries((prev) => [...prev, newEntry])
      }
    } catch (error: any) {
      console.error("Error añadiendo receta al menú:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const removeRecipeFromMenu = async (entryId: number) => {
    try {
      const { error } = await supabase.from("weekly_menu").delete().eq("id", entryId)

      if (error) throw error

      setMenuEntries((prev) => prev.filter((entry) => entry.id !== entryId))
    } catch (error: any) {
      console.error("Error eliminando receta del menú:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const getMenuEntry = (day: string, mealType: string) => {
    // Mapear tipos de comida para la búsqueda
    const mealTypeMapping: Record<string, string> = {
      lunch: "comida",
      dinner: "cena",
    }

    const dbMealType = mealTypeMapping[mealType] || mealType
    return menuEntries.find((entry) => entry.day === day && entry.meal_type === dbMealType)
  }

  // Calcular estadísticas
  const totalCalories = menuEntries.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0)
  const averageCaloriesPerDay = totalCalories / 7
  const completedDays = DAYS.filter((day) => MEAL_TYPES.every((mealType) => getMenuEntry(day, mealType.value))).length

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Cargando menú semanal...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Planificador Semanal</h1>
        <p className="text-gray-600">Organiza tus comidas para toda la semana</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{totalCalories.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Calorías totales</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{Math.round(averageCaloriesPerDay)}</div>
            <div className="text-sm text-gray-600">Promedio por día</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ChefHat className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{completedDays}/7</div>
            <div className="text-sm text-gray-600">Días completos</div>
          </CardContent>
        </Card>
      </div>

      {/* Planificador */}
      <div className="grid gap-6">
        {DAYS.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MEAL_TYPES.map((mealType) => {
                  const entry = getMenuEntry(day, mealType.value)
                  return (
                    <div key={mealType.value} className={`p-4 rounded-lg border-2 ${mealType.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">{mealType.label}</h3>
                        {entry && (
                          <Button variant="ghost" size="sm" onClick={() => entry.id && removeRecipeFromMenu(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {entry ? (
                        <div className="space-y-2">
                          <div className="font-medium">{entry.recipe?.name}</div>
                          {entry.recipe?.calories && <Badge variant="secondary">{entry.recipe.calories} cal</Badge>}
                        </div>
                      ) : (
                        <Select onValueChange={(value) => addRecipeToMenu(day, mealType.value, Number.parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar receta" />
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
