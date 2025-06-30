"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { Calendar, ChefHat, Clock, Users, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Recipe {
  id: number
  title: string
  description: string
  prep_time: number
  cook_time: number
  servings: number
  category: string
}

interface MenuPlan {
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

export default function WeeklyMenuView() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuPlan, setMenuPlan] = useState<MenuPlan>({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("recipes").select("*").order("title")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error fetching recipes:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = (day: string, mealType: "lunch" | "dinner", recipeId: string) => {
    const recipe = recipes.find((r) => r.id.toString() === recipeId)
    if (!recipe) return

    setMenuPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: recipe,
      },
    }))

    toast({
      title: "Receta añadida",
      description: `${recipe.title} añadida al ${mealType === "lunch" ? "almuerzo" : "cena"} del ${DAYS_OF_WEEK.find((d) => d.key === day)?.label}`,
    })
  }

  const removeRecipeFromMenu = (day: string, mealType: "lunch" | "dinner") => {
    setMenuPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: undefined,
      },
    }))

    toast({
      title: "Receta eliminada",
      description: "Receta eliminada del menú",
    })
  }

  const getTotalTime = (recipe: Recipe) => {
    return (recipe.prep_time || 0) + (recipe.cook_time || 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Planificador de Menú Semanal</h1>
        <p className="text-muted-foreground">Organiza tus comidas y cenas para toda la semana</p>
      </div>

      <div className="grid gap-6">
        {DAYS_OF_WEEK.map((day) => (
          <Card key={day.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Almuerzo */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Almuerzo</h4>
                  {menuPlan[day.key]?.lunch ? (
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{menuPlan[day.key].lunch!.title}</h5>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {menuPlan[day.key].lunch!.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipeFromMenu(day.key, "lunch")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {getTotalTime(menuPlan[day.key].lunch!)} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {menuPlan[day.key].lunch!.servings} personas
                        </div>
                        <Badge variant="secondary">{menuPlan[day.key].lunch!.category}</Badge>
                      </div>
                    </div>
                  ) : (
                    <Select onValueChange={(value) => addRecipeToMenu(day.key, "lunch", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar receta para almuerzo" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id.toString()}>
                            <div className="flex items-center gap-2">
                              <ChefHat className="h-4 w-4" />
                              {recipe.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Cena */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cena</h4>
                  {menuPlan[day.key]?.dinner ? (
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium">{menuPlan[day.key].dinner!.title}</h5>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {menuPlan[day.key].dinner!.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipeFromMenu(day.key, "dinner")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {getTotalTime(menuPlan[day.key].dinner!)} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {menuPlan[day.key].dinner!.servings} personas
                        </div>
                        <Badge variant="secondary">{menuPlan[day.key].dinner!.category}</Badge>
                      </div>
                    </div>
                  ) : (
                    <Select onValueChange={(value) => addRecipeToMenu(day.key, "dinner", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar receta para cena" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id.toString()}>
                            <div className="flex items-center gap-2">
                              <ChefHat className="h-4 w-4" />
                              {recipe.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Resumen de la Semana</CardTitle>
          <CardDescription>Vista general de tu planificación semanal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {Object.values(menuPlan).reduce((acc, day) => {
                  return acc + (day.lunch ? 1 : 0) + (day.dinner ? 1 : 0)
                }, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Comidas planificadas</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {
                  new Set(
                    Object.values(menuPlan)
                      .flatMap((day) => [day.lunch?.category, day.dinner?.category])
                      .filter(Boolean),
                  ).size
                }
              </div>
              <div className="text-sm text-muted-foreground">Categorías diferentes</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {Math.round(
                  Object.values(menuPlan).reduce((acc, day) => {
                    const lunchTime = day.lunch ? getTotalTime(day.lunch) : 0
                    const dinnerTime = day.dinner ? getTotalTime(day.dinner) : 0
                    return acc + lunchTime + dinnerTime
                  }, 0) / 60,
                )}
                h
              </div>
              <div className="text-sm text-muted-foreground">Tiempo total de cocina</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
