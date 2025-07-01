"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Calendar, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
}

interface MenuEntry {
  day: string
  mealType: "lunch" | "dinner"
  recipe: Recipe | null
}

interface WeeklyMenuViewProps {
  recipes: Recipe[]
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "lunch" as const, label: "Comida", color: "border-blue-300 bg-blue-50" },
  { key: "dinner" as const, label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export default function WeeklyMenuView({ recipes }: WeeklyMenuViewProps) {
  const [menu, setMenu] = useState<MenuEntry[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; mealType: "lunch" | "dinner" } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Inicializar menú vacío
  useEffect(() => {
    const initialMenu: MenuEntry[] = []
    DAYS.forEach((day) => {
      MEAL_TYPES.forEach((mealType) => {
        initialMenu.push({
          day,
          mealType: mealType.key,
          recipe: null,
        })
      })
    })
    setMenu(initialMenu)
  }, [])

  // Cargar menú existente
  useEffect(() => {
    loadExistingMenu()
  }, [])

  const loadExistingMenu = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("weekly_menu").select(`
          day,
          meal_type,
          recipes (
            id,
            name,
            calories,
            image_url
          )
        `)

      if (error) throw error

      if (data) {
        setMenu((prevMenu) =>
          prevMenu.map((entry) => {
            const existing = data.find(
              (d) => d.day === entry.day && d.meal_type === (entry.mealType === "lunch" ? "comida" : "cena"),
            )
            return existing ? { ...entry, recipe: existing.recipes } : entry
          }),
        )
      }
    } catch (error) {
      console.error("Error cargando menú:", error)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: "lunch" | "dinner", recipe: Recipe) => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // Mapear tipos de comida al español para la base de datos
      const mealTypeSpanish = mealType === "lunch" ? "comida" : "cena"

      console.log(`Añadiendo receta ${recipe.name} para ${day} - ${mealTypeSpanish}`)

      const { error } = await supabase.from("weekly_menu").upsert(
        {
          day,
          meal_type: mealTypeSpanish,
          recipe_id: recipe.id,
        },
        {
          onConflict: "day,meal_type",
        },
      )

      if (error) {
        console.error("Error guardando en base de datos:", error)
        throw error
      }

      // Actualizar estado local
      setMenu((prevMenu) =>
        prevMenu.map((entry) => (entry.day === day && entry.mealType === mealType ? { ...entry, recipe } : entry)),
      )

      console.log(`✅ Receta guardada exitosamente`)
    } catch (error) {
      console.error("Error añadiendo receta al menú:", error)
    } finally {
      setIsLoading(false)
      setSelectedSlot(null)
      setSelectedRecipe(null)
    }
  }

  const removeRecipeFromMenu = async (day: string, mealType: "lunch" | "dinner") => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const mealTypeSpanish = mealType === "lunch" ? "comida" : "cena"

      const { error } = await supabase.from("weekly_menu").delete().eq("day", day).eq("meal_type", mealTypeSpanish)

      if (error) throw error

      setMenu((prevMenu) =>
        prevMenu.map((entry) =>
          entry.day === day && entry.mealType === mealType ? { ...entry, recipe: null } : entry,
        ),
      )
    } catch (error) {
      console.error("Error eliminando receta del menú:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMenuStats = () => {
    const totalCalories = menu.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0)
    const filledSlots = menu.filter((entry) => entry.recipe !== null).length
    const totalSlots = menu.length
    const avgCaloriesPerDay = totalCalories / 7

    return {
      totalCalories,
      filledSlots,
      totalSlots,
      avgCaloriesPerDay: Math.round(avgCaloriesPerDay),
      completionPercentage: Math.round((filledSlots / totalSlots) * 100),
    }
  }

  const stats = getMenuStats()

  return (
    <div className="space-y-6">
      {/* Estadísticas del menú */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumen del Menú Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalCalories}</div>
              <div className="text-sm text-gray-600">Calorías totales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.avgCaloriesPerDay}</div>
              <div className="text-sm text-gray-600">Promedio/día</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.filledSlots}/{stats.totalSlots}
              </div>
              <div className="text-sm text-gray-600">Comidas planificadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completionPercentage}%</div>
              <div className="text-sm text-gray-600">Completado</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planificador semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <Card key={day} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-sm font-medium flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TYPES.map((mealType) => {
                const entry = menu.find((e) => e.day === day && e.mealType === mealType.key)
                return (
                  <div key={mealType.key} className={`p-3 rounded-lg border-2 ${mealType.color}`}>
                    <div className="text-xs font-medium text-gray-700 mb-2">{mealType.label}</div>
                    {entry?.recipe ? (
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{entry.recipe.name}</h4>
                            {entry.recipe.calories && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                {entry.recipe.calories} cal
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRecipeFromMenu(day, mealType.key)}
                            disabled={isLoading}
                            className="ml-2 h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSlot({ day, mealType: mealType.key })}
                        className="w-full h-16 border-2 border-dashed border-gray-300 hover:border-gray-400"
                        disabled={isLoading}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de selección de recetas */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  Seleccionar receta para {selectedSlot.day} -{" "}
                  {MEAL_TYPES.find((mt) => mt.key === selectedSlot.mealType)?.label}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSlot(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => addRecipeToMenu(selectedSlot.day, selectedSlot.mealType, recipe)}
                  >
                    <div className="flex items-center gap-3">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url || "/placeholder.svg"}
                          alt={recipe.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">🍽️</div>
                      )}
                      <div>
                        <h4 className="font-medium">{recipe.name}</h4>
                        {recipe.calories && (
                          <Badge variant="secondary" className="text-xs">
                            {recipe.calories} cal
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm">Seleccionar</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
