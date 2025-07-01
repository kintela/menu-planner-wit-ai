"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChefHat, Plus, BarChart3, Clock, Target } from "lucide-react"
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

interface WeeklyMenuStats {
  totalCalories: number
  averageCaloriesPerDay: number
  completedDays: number
  totalMeals: number
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch", label: "Comida", color: "border-blue-300 bg-blue-50" },
  { key: "dinner", label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export function WeeklyMenuView() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar recetas
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, calories, image_url")
        .order("name")

      if (recipesError) throw recipesError

      // Cargar menú semanal actual
      const { data: menuData, error: menuError } = await supabase
        .from("weekly_menu")
        .select(`
          id,
          day,
          meal_type,
          recipe_id,
          recipes (
            id,
            name,
            calories,
            image_url
          )
        `)
        .order("day")
        .order("meal_type")

      if (menuError) throw menuError

      setRecipes(recipesData || [])
      setMenuEntries(
        menuData?.map((entry) => ({
          ...entry,
          recipe: entry.recipes,
        })) || [],
      )
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: string, recipeId: number) => {
    try {
      setSaving(true)

      // Mapear tipos de comida al español para la base de datos
      const mealTypeMapping: Record<string, string> = {
        lunch: "comida",
        dinner: "cena",
      }

      const dbMealType = mealTypeMapping[mealType] || mealType

      console.log(`🍽️ Añadiendo receta al menú:`, {
        day,
        mealType: mealType,
        dbMealType,
        recipeId,
      })

      // Verificar si ya existe una entrada para este día y tipo de comida
      const existingEntry = menuEntries.find((entry) => entry.day === day && entry.meal_type === dbMealType)

      if (existingEntry) {
        // Actualizar entrada existente
        const { error } = await supabase.from("weekly_menu").update({ recipe_id: recipeId }).eq("id", existingEntry.id)

        if (error) throw error

        console.log(`✅ Entrada actualizada exitosamente`)
      } else {
        // Crear nueva entrada
        const { error } = await supabase.from("weekly_menu").insert({
          day,
          meal_type: dbMealType,
          recipe_id: recipeId,
        })

        if (error) throw error

        console.log(`✅ Nueva entrada creada exitosamente`)
      }

      // Recargar datos para reflejar cambios
      await loadData()
    } catch (error) {
      console.error("❌ Error añadiendo receta al menú:", error)
    } finally {
      setSaving(false)
    }
  }

  const removeFromMenu = async (day: string, mealType: string) => {
    try {
      setSaving(true)

      const mealTypeMapping: Record<string, string> = {
        lunch: "comida",
        dinner: "cena",
      }

      const dbMealType = mealTypeMapping[mealType] || mealType

      const { error } = await supabase.from("weekly_menu").delete().eq("day", day).eq("meal_type", dbMealType)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error("Error eliminando del menú:", error)
    } finally {
      setSaving(false)
    }
  }

  const getRecipeForSlot = (day: string, mealType: string): Recipe | null => {
    const mealTypeMapping: Record<string, string> = {
      lunch: "comida",
      dinner: "cena",
    }

    const dbMealType = mealTypeMapping[mealType] || mealType
    const entry = menuEntries.find((entry) => entry.day === day && entry.meal_type === dbMealType)
    return entry?.recipe || null
  }

  // Calcular estadísticas del menú
  const calculateStats = (): WeeklyMenuStats => {
    const totalCalories = menuEntries.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0)
    const totalMeals = menuEntries.length
    const completedDays = DAYS.filter((day) =>
      MEAL_TYPES.every((mealType) => getRecipeForSlot(day, mealType.key)),
    ).length
    const averageCaloriesPerDay = completedDays > 0 ? totalCalories / completedDays : 0

    return {
      totalCalories,
      averageCaloriesPerDay: Math.round(averageCaloriesPerDay),
      completedDays,
      totalMeals,
    }
  }

  const stats = calculateStats()

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
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Planificador Semanal</h1>
          <p className="text-gray-600">Organiza tus comidas de la semana</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Calorías Totales</p>
                <p className="text-2xl font-bold">{stats.totalCalories}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Promedio/Día</p>
                <p className="text-2xl font-bold">{stats.averageCaloriesPerDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Días Completos</p>
                <p className="text-2xl font-bold">
                  {stats.completedDays}/{DAYS.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Comidas</p>
                <p className="text-2xl font-bold">
                  {stats.totalMeals}/{DAYS.length * MEAL_TYPES.length}
                </p>
              </div>
            </div>
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
                  const recipe = getRecipeForSlot(day, mealType.key)
                  return (
                    <div key={mealType.key} className={`p-4 rounded-lg border-2 ${mealType.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{mealType.label}</h3>
                        {recipe && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromMenu(day, mealType.key)}
                            disabled={saving}
                          >
                            ×
                          </Button>
                        )}
                      </div>

                      {recipe ? (
                        <div className="space-y-2">
                          <p className="font-medium">{recipe.name}</p>
                          {recipe.calories && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {recipe.calories} cal
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Select
                          onValueChange={(value) => addRecipeToMenu(day, mealType.key, Number.parseInt(value))}
                          disabled={saving}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar receta" />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{recipe.name}</span>
                                  {recipe.calories && (
                                    <span className="text-xs text-gray-500 ml-2">{recipe.calories} cal</span>
                                  )}
                                </div>
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

      {/* Mensaje de ayuda */}
      {recipes.length === 0 && (
        <Card className="mt-8">
          <CardContent className="text-center py-8">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes recetas aún</h3>
            <p className="text-gray-600 mb-4">Añade algunas recetas para poder planificar tu menú semanal</p>
            <Button asChild>
              <a href="/recipes/add">
                <Plus className="mr-2 h-4 w-4" />
                Añadir primera receta
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
