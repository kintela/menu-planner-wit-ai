"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChefHat, Clock, Utensils, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  user_profiles?: {
    full_name: string
    first_name: string
  }
}

interface MenuEntry {
  day: string
  mealType: "lunch" | "dinner"
  recipe: Recipe | null
}

interface WeeklyMenuViewProps {
  recipes: Recipe[]
}

const DAYS_OF_WEEK = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

const MEAL_TYPES = [
  { key: "lunch", label: "Comida", color: "bg-blue-50 border-blue-200" },
  { key: "dinner", label: "Cena", color: "bg-orange-50 border-orange-200" },
]

export default function WeeklyMenuView({ recipes }: WeeklyMenuViewProps) {
  const [menu, setMenu] = useState<MenuEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Inicializar menú vacío
  useEffect(() => {
    const initialMenu: MenuEntry[] = []
    DAYS_OF_WEEK.forEach((day) => {
      MEAL_TYPES.forEach((mealType) => {
        initialMenu.push({
          day: day.key,
          mealType: mealType.key as "lunch" | "dinner",
          recipe: null,
        })
      })
    })
    setMenu(initialMenu)
  }, [])

  const addRecipeToMenu = async (day: string, mealType: "lunch" | "dinner", recipeId: number) => {
    const recipe = recipes.find((r) => r.id === recipeId)
    if (!recipe) return

    setIsLoading(true)

    try {
      // Simular guardado en base de datos
      await new Promise((resolve) => setTimeout(resolve, 500))

      setMenu((prevMenu) =>
        prevMenu.map((entry) => (entry.day === day && entry.mealType === mealType ? { ...entry, recipe } : entry)),
      )

      toast({
        title: "✅ Receta añadida",
        description: `${recipe.name} añadida al ${MEAL_TYPES.find((m) => m.key === mealType)?.label.toLowerCase()} del ${DAYS_OF_WEEK.find((d) => d.key === day)?.label}`,
      })
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeRecipeFromMenu = (day: string, mealType: "lunch" | "dinner") => {
    setMenu((prevMenu) =>
      prevMenu.map((entry) => (entry.day === day && entry.mealType === mealType ? { ...entry, recipe: null } : entry)),
    )

    toast({
      title: "🗑️ Receta eliminada",
      description: "Receta eliminada del menú",
    })
  }

  const clearMenu = () => {
    setMenu((prevMenu) => prevMenu.map((entry) => ({ ...entry, recipe: null })))

    toast({
      title: "🧹 Menú limpiado",
      description: "Se han eliminado todas las recetas del menú",
    })
  }

  const getMenuEntry = (day: string, mealType: "lunch" | "dinner") => {
    return menu.find((entry) => entry.day === day && entry.mealType === mealType)
  }

  const getTotalCalories = () => {
    return menu.reduce((total, entry) => {
      return total + (entry.recipe?.calories || 0)
    }, 0)
  }

  const getRecipeCount = () => {
    return menu.filter((entry) => entry.recipe !== null).length
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-2xl font-semibold mb-2">Planificador de Menú Semanal</h2>
        <p className="text-gray-600 mb-6">Necesitas tener recetas disponibles para poder planificar tu menú semanal.</p>
        <Button>
          <ChefHat className="h-4 w-4 mr-2" />
          Añadir Primera Receta
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Menú Semanal
          </h1>
          <p className="text-gray-600 mt-1">Planifica tus comidas para toda la semana</p>
        </div>

        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{getRecipeCount()}</div>
            <div className="text-sm text-gray-600">Comidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{getTotalCalories()}</div>
            <div className="text-sm text-gray-600">Calorías</div>
          </div>
          <Button variant="outline" onClick={clearMenu} size="sm">
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Grid del menú semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day.key} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TYPES.map((mealType) => {
                const entry = getMenuEntry(day.key, mealType.key as "lunch" | "dinner")
                return (
                  <div key={mealType.key} className={`p-3 rounded-lg border-2 ${mealType.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{mealType.label}</h4>
                      <Utensils className="h-4 w-4 text-gray-400" />
                    </div>

                    {entry?.recipe ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{entry.recipe.name}</div>
                        {entry.recipe.calories && (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            {entry.recipe.calories} cal
                          </div>
                        )}
                        {entry.recipe.is_ai_generated && (
                          <Badge variant="secondary" className="text-xs">
                            AI
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs bg-transparent"
                          onClick={() => removeRecipeFromMenu(day.key, mealType.key as "lunch" | "dinner")}
                        >
                          Quitar
                        </Button>
                      </div>
                    ) : (
                      <Select
                        onValueChange={(value) =>
                          addRecipeToMenu(day.key, mealType.key as "lunch" | "dinner", Number.parseInt(value))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Seleccionar receta" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id.toString()}>
                              <div className="flex items-center gap-2">
                                <span>{recipe.name}</span>
                                {recipe.calories && (
                                  <span className="text-xs text-gray-500">({recipe.calories} cal)</span>
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen del menú */}
      {getRecipeCount() > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Resumen del Menú
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{getRecipeCount()}</div>
                <div className="text-sm text-gray-600">Comidas planificadas</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{getTotalCalories()}</div>
                <div className="text-sm text-gray-600">Calorías totales</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(getTotalCalories() / Math.max(getRecipeCount(), 1))}
                </div>
                <div className="text-sm text-gray-600">Calorías promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
