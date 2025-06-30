"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { Calendar, Plus, Utensils } from "lucide-react"
import type { Recipe } from "@/lib/types"

interface WeeklyMenu {
  [key: string]: {
    lunch?: Recipe
    dinner?: Recipe
  }
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

export function WeeklyMenuView() {
  const { user } = useAuth()
  const [menu, setMenu] = useState<WeeklyMenu>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadRecipes()
      loadWeeklyMenu()
    }
  }, [user])

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase.from("recipes").select("*").eq("user_id", user?.id).order("name")

      if (error) {
        console.error("Error loading recipes:", error)
        setError(`Error loading recipes: ${error.message}`)
        return
      }

      setRecipes(data || [])
    } catch (err) {
      console.error("Error loading recipes:", err)
      setError("Error loading recipes: " + (err as Error).message)
    }
  }

  const loadWeeklyMenu = async () => {
    try {
      // For now, we'll start with an empty menu
      // In a real implementation, you'd load from a weekly_menus table
      setMenu({})
      setLoading(false)
    } catch (err) {
      console.error("Error loading weekly menu:", err)
      setError("Error loading weekly menu: " + (err as Error).message)
      setLoading(false)
    }
  }

  const addRecipeToMenu = (day: string, mealType: "lunch" | "dinner", recipe: Recipe) => {
    setMenu((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe,
      },
    }))
  }

  const removeRecipeFromMenu = (day: string, mealType: "lunch" | "dinner") => {
    setMenu((prev) => {
      const newMenu = { ...prev }
      if (newMenu[day]) {
        delete newMenu[day][mealType]
        if (!newMenu[day].lunch && !newMenu[day].dinner) {
          delete newMenu[day]
        }
      }
      return newMenu
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Calendar className="h-8 w-8" />
            <span>Menú Semanal</span>
          </h1>
          <p className="text-muted-foreground mt-2">Planifica tus comidas y cenas para toda la semana</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Guardar Menú
        </Button>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay recetas disponibles</CardTitle>
            <CardDescription>
              Necesitas agregar algunas recetas antes de poder planificar tu menú semanal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/recipes/add">Agregar Primera Receta</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {DAYS_OF_WEEK.map((day) => (
            <Card key={day.key}>
              <CardHeader>
                <CardTitle className="text-lg">{day.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Lunch */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Utensils className="h-4 w-4" />
                      <span>Comida</span>
                    </h4>
                    {menu[day.key]?.lunch ? (
                      <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm">{menu[day.key].lunch?.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipeFromMenu(day.key, "lunch")}>
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 border-2 border-dashed border-muted rounded-lg">
                        <select
                          className="w-full bg-transparent text-sm"
                          onChange={(e) => {
                            const recipe = recipes.find((r) => r.id === e.target.value)
                            if (recipe) addRecipeToMenu(day.key, "lunch", recipe)
                          }}
                          value=""
                        >
                          <option value="">Seleccionar receta...</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center space-x-2">
                      <Utensils className="h-4 w-4" />
                      <span>Cena</span>
                    </h4>
                    {menu[day.key]?.dinner ? (
                      <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                        <span className="text-sm">{menu[day.key].dinner?.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipeFromMenu(day.key, "dinner")}>
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 border-2 border-dashed border-muted rounded-lg">
                        <select
                          className="w-full bg-transparent text-sm"
                          onChange={(e) => {
                            const recipe = recipes.find((r) => r.id === e.target.value)
                            if (recipe) addRecipeToMenu(day.key, "dinner", recipe)
                          }}
                          value=""
                        >
                          <option value="">Seleccionar receta...</option>
                          {recipes.map((recipe) => (
                            <option key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
