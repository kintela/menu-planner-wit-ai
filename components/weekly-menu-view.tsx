"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { Calendar, ChefHat, Plus } from "lucide-react"

interface Recipe {
  id: string
  title: string
  description?: string
  category?: string
}

interface MenuPlan {
  id: string
  day_of_week: string
  meal_type: string
  recipe_id: string
  recipe?: Recipe
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const MEAL_TYPES = ["Comida", "Cena"]

export default function WeeklyMenuView() {
  const { user, loading } = useAuth()
  const [menuPlans, setMenuPlans] = useState<MenuPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadMenuPlans()
      loadRecipes()
    }
  }, [user])

  const loadMenuPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_plans")
        .select(`
          *,
          recipe:recipes(id, title, description, category)
        `)
        .eq("user_id", user?.id)

      if (error) throw error
      setMenuPlans(data || [])
    } catch (error) {
      console.error("Error loading menu plans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, title, description, category")
        .eq("user_id", user?.id)
        .order("title")

      if (error) throw error
      setRecipes(data || [])
    } catch (error) {
      console.error("Error loading recipes:", error)
    }
  }

  const getMenuForDayAndMeal = (day: string, mealType: string) => {
    return menuPlans.find((plan) => plan.day_of_week === day && plan.meal_type === mealType)
  }

  if (loading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8 mx-auto"></div>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h2 className="text-2xl font-bold mb-4">Planifica tu menú semanal</h2>
        <p className="text-gray-600 mb-6">Inicia sesión para comenzar a planificar tus comidas de la semana</p>
        <Link href="/login">
          <Button>Iniciar Sesión</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Menú Semanal</h1>
        <p className="text-gray-600">Planifica tus comidas y cenas para toda la semana</p>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <CardTitle>No tienes recetas aún</CardTitle>
            <CardDescription>Necesitas crear algunas recetas antes de poder planificar tu menú semanal</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/recipes/add">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primera receta
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {DAYS_OF_WEEK.map((day) => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {MEAL_TYPES.map((mealType) => {
                    const menuItem = getMenuForDayAndMeal(day, mealType)
                    return (
                      <div key={mealType} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{mealType}</h4>
                        {menuItem?.recipe ? (
                          <div className="space-y-2">
                            <p className="font-medium">{menuItem.recipe.title}</p>
                            {menuItem.recipe.description && (
                              <p className="text-sm text-gray-600">{menuItem.recipe.description}</p>
                            )}
                            <Link href={`/recipes/${menuItem.recipe.id}`}>
                              <Button variant="outline" size="sm">
                                Ver receta
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 mb-2">Sin planificar</p>
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Añadir
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
