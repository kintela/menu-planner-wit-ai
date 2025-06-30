"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { Trash2 } from "lucide-react"

interface Recipe {
  id: string
  title: string
  category: string
}

interface MenuEntry {
  id: string
  day: string
  meal_type: "lunch" | "dinner"
  recipe_id: string
  recipe?: Recipe
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const MEAL_TYPES = {
  lunch: "Comida",
  dinner: "Cena",
}

export default function WeeklyMenuView() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, title, category")
        .eq("user_id", user?.id)
        .order("title")

      if (recipesError) throw recipesError

      // Load menu entries
      const { data: menuData, error: menuError } = await supabase
        .from("weekly_menu")
        .select(`
          id,
          day,
          meal_type,
          recipe_id,
          recipe:recipes(id, title, category)
        `)
        .eq("user_id", user?.id)

      if (menuError) throw menuError

      setRecipes(recipesData || [])
      setMenuEntries(menuData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addRecipeToMenu = async (day: string, mealType: "lunch" | "dinner", recipeId: string) => {
    try {
      // Check if entry already exists
      const existingEntry = menuEntries.find((entry) => entry.day === day && entry.meal_type === mealType)

      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase.from("weekly_menu").update({ recipe_id: recipeId }).eq("id", existingEntry.id)

        if (error) throw error
      } else {
        // Create new entry
        const { error } = await supabase.from("weekly_menu").insert({
          user_id: user?.id,
          day,
          meal_type: mealType,
          recipe_id: recipeId,
        })

        if (error) throw error
      }

      await loadData()
      toast({
        title: "Éxito",
        description: "Receta añadida al menú",
      })
    } catch (error) {
      console.error("Error adding recipe to menu:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la receta al menú",
        variant: "destructive",
      })
    }
  }

  const removeFromMenu = async (entryId: string) => {
    try {
      const { error } = await supabase.from("weekly_menu").delete().eq("id", entryId)

      if (error) throw error

      await loadData()
      toast({
        title: "Éxito",
        description: "Receta eliminada del menú",
      })
    } catch (error) {
      console.error("Error removing from menu:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    }
  }

  const getMenuEntry = (day: string, mealType: "lunch" | "dinner") => {
    return menuEntries.find((entry) => entry.day === day && entry.meal_type === mealType)
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        {DAYS.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="animate-pulse h-6 bg-gray-200 rounded w-24"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
                <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {recipes.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No tienes recetas aún.
              <Button variant="link" asChild className="p-0 ml-1">
                <a href="/recipes/add">Crea tu primera receta</a>
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {DAYS.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(MEAL_TYPES).map(([mealType, mealLabel]) => {
                  const entry = getMenuEntry(day, mealType as "lunch" | "dinner")

                  return (
                    <div key={mealType} className="space-y-2">
                      <h4 className="font-medium">{mealLabel}</h4>

                      {entry ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{entry.recipe?.title}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeFromMenu(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Select
                          onValueChange={(recipeId) => addRecipeToMenu(day, mealType as "lunch" | "dinner", recipeId)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar receta" />
                          </SelectTrigger>
                          <SelectContent>
                            {recipes.map((recipe) => (
                              <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.title}
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
