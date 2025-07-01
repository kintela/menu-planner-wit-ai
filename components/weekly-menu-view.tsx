"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChefHat, Utensils, BarChart3, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Recipe {
  id: number
  name: string
  calories?: number
  ingredients: string
  preparation: string
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

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

const MEAL_TYPES = [
  { key: "lunch", label: "Comida", color: "border-blue-300 bg-blue-50" },
  { key: "dinner", label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export default function WeeklyMenuView({ recipes }: WeeklyMenuViewProps) {
  const [menu, setMenu] = useState<MenuEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Inicializar menú vacío
  useEffect(() => {
    const initialMenu: MenuEntry[] = []
    DAYS.forEach((day) => {
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

      setMenu((prev) =>
        prev.map((entry) => (entry.day === day && entry.mealType === mealType ? { ...entry, recipe } : entry)),
      )

      toast({
        title: "Receta añadida",
        description: `${recipe.name} añadida al ${mealType === "lunch" ? "almuerzo" : "cena"} del ${
          DAYS.find((d) => d.key === day)?.label
        }`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeRecipeFromMenu = async (day: string, mealType: "lunch" | "dinner") => {
    setIsLoading(true)
    try {
      // Simular eliminación en base de datos
      await new Promise((resolve) => setTimeout(resolve, 300))

      setMenu((prev) =>
        prev.map((entry) => (entry.day === day && entry.mealType === mealType ? { ...entry, recipe: null } : entry)),
      )

      toast({
        title: "Receta eliminada",
        description: "Receta eliminada del menú",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearMenu = () => {
    setMenu((prev) => prev.map((entry) => ({ ...entry, recipe: null })))
    toast({
      title: "Menú limpiado",
      description: "Se han eliminado todas las recetas del menú",
    })
  }

  // Calcular estadísticas
  const stats = {
    totalRecipes: menu.filter((entry) => entry.recipe).length,
    totalCalories: menu.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0),
    avgCaloriesPerDay: Math.round(menu.reduce((sum, entry) => sum + (entry.recipe?.calories || 0), 0) / DAYS.length),
    completeDays: DAYS.filter((day) =>
      MEAL_TYPES.every(
        (mealType) => menu.find((entry) => entry.day === day.key && entry.mealType === mealType.key)?.recipe,
      ),
    ).length,
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Planificador Semanal</h1>
          <p className="text-gray-600">Organiza tus comidas para toda la semana</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearMenu} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar menú
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Recetas</p>
                <p className="text-2xl font-bold">{stats.totalRecipes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Calorías totales</p>
                <p className="text-2xl font-bold">{stats.totalCalories}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Promedio/día</p>
                <p className="text-2xl font-bold">{stats.avgCaloriesPerDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Días completos</p>
                <p className="text-2xl font-bold">{stats.completeDays}/7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid del menú semanal */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS.map((day) => (
          <Card key={day.key} className="min-h-[400px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">{day.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MEAL_TYPES.map((mealType) => {
                const menuEntry = menu.find((entry) => entry.day === day.key && entry.mealType === mealType.key)
                const recipe = menuEntry?.recipe

                return (
                  <div key={mealType.key} className={`p-3 rounded-lg border-2 ${mealType.color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {mealType.label}
                      </Badge>
                      {recipe && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRecipeFromMenu(day.key, mealType.key as "lunch" | "dinner")}
                          disabled={isLoading}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {recipe ? (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm line-clamp-2">{recipe.name}</h4>
                        {recipe.image_url && (
                          <img
                            src={recipe.image_url || "/placeholder.svg"}
                            alt={recipe.name}
                            className="w-full h-20 object-cover rounded"
                          />
                        )}
                        {recipe.calories && (
                          <Badge variant="secondary" className="text-xs">
                            {recipe.calories} cal
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          onValueChange={(value) =>
                            addRecipeToMenu(day.key, mealType.key as "lunch" | "dinner", Number.parseInt(value))
                          }
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar receta" />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{recipe.name}</span>
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
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen semanal */}
      {stats.totalRecipes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resumen Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Distribución de comidas</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Almuerzos:</span>
                    <span>{menu.filter((e) => e.mealType === "lunch" && e.recipe).length}/7</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cenas:</span>
                    <span>{menu.filter((e) => e.mealType === "dinner" && e.recipe).length}/7</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Información nutricional</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total semanal:</span>
                    <span>{stats.totalCalories} cal</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Promedio diario:</span>
                    <span>{stats.avgCaloriesPerDay} cal</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Progreso</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Días completos:</span>
                    <span>{stats.completeDays}/7</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.completeDays / 7) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
