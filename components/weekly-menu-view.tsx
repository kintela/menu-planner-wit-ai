"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChefHat, Flame, Users, Trash2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
  user_profiles?: {
    full_name?: string
    first_name?: string
  }
}

interface MenuEntry {
  id?: number
  day: string
  meal_type: string
  recipe_id: number
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  initialRecipes?: Recipe[]
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch", label: "Primer plato", color: "border-blue-300 bg-blue-50" },
  { key: "lunch2", label: "Segundo plato", color: "border-green-300 bg-green-50" },
  { key: "dinner", label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export function WeeklyMenuView({ initialRecipes = [] }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRecipeSelector, setShowRecipeSelector] = useState<{
    day: string
    mealType: string
  } | null>(null)

  const supabase = createClient()

  // Cargar recetas y menú al montar el componente
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Cargar recetas si no se proporcionaron
      if (recipes.length === 0) {
        const { data: recipesData } = await supabase
          .from("recipes")
          .select(`
            id,
            name,
            calories,
            image_url,
            user_profiles (
              full_name,
              first_name
            )
          `)
          .order("name")

        if (recipesData) {
          setRecipes(recipesData)
        }
      }

      // Cargar menú semanal
      const { data: menuData } = await supabase
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
            image_url,
            user_profiles (
              full_name,
              first_name
            )
          )
        `)
        .order("day")
        .order("meal_type")

      if (menuData) {
        const formattedEntries = menuData.map((entry) => ({
          id: entry.id,
          day: entry.day,
          meal_type: entry.meal_type,
          recipe_id: entry.recipe_id,
          recipe: entry.recipes as Recipe,
        }))
        setMenuEntries(formattedEntries)
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: string, recipeId: number) => {
    try {
      // Mapear meal types al formato de la base de datos
      const mealTypeMapping: { [key: string]: string } = {
        lunch: "comida",
        lunch2: "comida",
        dinner: "cena",
      }

      const dbMealType = mealTypeMapping[mealType] || mealType

      console.log(`Añadiendo receta ${recipeId} para ${day} - ${dbMealType}`)

      const { data, error } = await supabase
        .from("weekly_menu")
        .insert({
          day: day,
          meal_type: dbMealType,
          recipe_id: recipeId,
        })
        .select(`
          id,
          day,
          meal_type,
          recipe_id,
          recipes (
            id,
            name,
            calories,
            image_url,
            user_profiles (
              full_name,
              first_name
            )
          )
        `)

      if (error) {
        console.error("Error añadiendo receta al menú:", error)
        return
      }

      if (data && data[0]) {
        const newEntry: MenuEntry = {
          id: data[0].id,
          day: data[0].day,
          meal_type: mealType, // Usar el tipo original para la UI
          recipe_id: data[0].recipe_id,
          recipe: data[0].recipes as Recipe,
        }

        setMenuEntries((prev) => [...prev, newEntry])
        console.log("✅ Receta añadida exitosamente")
      }

      setShowRecipeSelector(null)
    } catch (error) {
      console.error("Error en addRecipeToMenu:", error)
    }
  }

  const removeRecipeFromMenu = async (entryId: number) => {
    try {
      const { error } = await supabase.from("weekly_menu").delete().eq("id", entryId)

      if (error) {
        console.error("Error eliminando receta del menú:", error)
        return
      }

      setMenuEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      console.log("✅ Receta eliminada del menú")
    } catch (error) {
      console.error("Error en removeRecipeFromMenu:", error)
    }
  }

  const getMenuEntry = (day: string, mealType: string): MenuEntry | undefined => {
    return menuEntries.find((entry) => entry.day === day && entry.meal_type === mealType)
  }

  const getTotalCalories = (): number => {
    return menuEntries.reduce((total, entry) => {
      return total + (entry.recipe?.calories || 0)
    }, 0)
  }

  const getAverageCaloriesPerDay = (): number => {
    const totalCalories = getTotalCalories()
    return Math.round(totalCalories / 7)
  }

  const getCompletedDays = (): number => {
    const dayCompleteness = DAYS.map((day) => {
      const dayEntries = menuEntries.filter((entry) => entry.day === day)
      return dayEntries.length >= 2 // Al menos 2 comidas por día
    })
    return dayCompleteness.filter(Boolean).length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Cargando planificador...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas del menú */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Total Calorías</p>
                <p className="text-2xl font-bold">{getTotalCalories()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Promedio/Día</p>
                <p className="text-2xl font-bold">{getAverageCaloriesPerDay()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Días Completos</p>
                <p className="text-2xl font-bold">{getCompletedDays()}/7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planificador semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planificador Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {DAYS.map((day) => (
              <div key={day} className="space-y-3">
                <h3 className="font-semibold text-center text-sm">{day}</h3>
                {MEAL_TYPES.map((mealType) => {
                  const entry = getMenuEntry(day, mealType.key)
                  return (
                    <div
                      key={`${day}-${mealType.key}`}
                      className={`border-2 rounded-lg p-3 min-h-[120px] ${mealType.color}`}
                    >
                      <p className="text-xs font-medium mb-2">{mealType.label}</p>
                      {entry?.recipe ? (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-2">{entry.recipe.name}</p>
                              {entry.recipe.calories && (
                                <p className="text-xs text-gray-600">{entry.recipe.calories} cal</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.id && removeRecipeFromMenu(entry.id)}
                              className="h-6 w-6 p-0 ml-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRecipeSelector({ day, mealType: mealType.key })}
                          className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                        >
                          <Plus className="h-4 w-4 mb-1" />
                          <span className="text-xs">Añadir</span>
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selector de recetas */}
      {showRecipeSelector && (
        <Card>
          <CardHeader>
            <CardTitle>
              Seleccionar receta para {showRecipeSelector.day} -{" "}
              {MEAL_TYPES.find((mt) => mt.key === showRecipeSelector.mealType)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => addRecipeToMenu(showRecipeSelector.day, showRecipeSelector.mealType, recipe.id)}
                >
                  <div className="flex items-start gap-3">
                    {recipe.image_url && (
                      <img
                        src={recipe.image_url || "/placeholder.svg"}
                        alt={recipe.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{recipe.name}</p>
                      {recipe.calories && <p className="text-xs text-gray-600">{recipe.calories} cal</p>}
                      {recipe.user_profiles && (
                        <p className="text-xs text-gray-500">
                          {recipe.user_profiles.first_name || recipe.user_profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowRecipeSelector(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
