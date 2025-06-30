"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Recipe {
  id: string
  name: string
  description?: string
  prep_time?: number
  cook_time?: number
  servings?: number
}

interface MealSlot {
  day: string
  meal: string
  recipe?: Recipe
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

const MEALS = [
  { key: "breakfast", label: "Desayuno" },
  { key: "lunch", label: "Comida" },
  { key: "dinner", label: "Cena" },
]

export function WeeklyMenuView() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [weeklyMenu, setWeeklyMenu] = useState<{ [key: string]: { [key: string]: Recipe | null } }>({})
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; meal: string } | null>(null)

  useEffect(() => {
    if (user) {
      loadWeeklyMenu()
      loadRecipes()
    }
  }, [user])

  const loadWeeklyMenu = async () => {
    try {
      const { data, error } = await supabase
        .from("weekly_menus")
        .select(`
          *,
          weekly_menu_items (
            day,
            meal,
            recipe_id,
            recipes (
              id,
              name,
              description,
              prep_time,
              cook_time,
              servings
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error loading weekly menu:", error)
        return
      }

      if (data && data.length > 0) {
        const menu = data[0]
        const menuData: { [key: string]: { [key: string]: Recipe | null } } = {}

        // Initialize empty menu
        DAYS.forEach((day) => {
          menuData[day.key] = {}
          MEALS.forEach((meal) => {
            menuData[day.key][meal.key] = null
          })
        })

        // Fill with existing data
        menu.weekly_menu_items?.forEach((item: any) => {
          if (item.recipes) {
            menuData[item.day] = menuData[item.day] || {}
            menuData[item.day][item.meal] = item.recipes
          }
        })

        setWeeklyMenu(menuData)
      } else {
        // Initialize empty menu
        const emptyMenu: { [key: string]: { [key: string]: Recipe | null } } = {}
        DAYS.forEach((day) => {
          emptyMenu[day.key] = {}
          MEALS.forEach((meal) => {
            emptyMenu[day.key][meal.key] = null
          })
        })
        setWeeklyMenu(emptyMenu)
      }
    } catch (error) {
      console.error("Error loading weekly menu:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el menú semanal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRecipes = async () => {
    try {
      // Try with 'name' column first, fallback to 'title' if it fails
      let { data, error } = await supabase
        .from("recipes")
        .select("id, name, description, prep_time, cook_time, servings")
        .eq("user_id", user?.id)

      if (error && error.message.includes("column recipes.name does not exist")) {
        // Fallback to 'title' column
        const { data: titleData, error: titleError } = await supabase
          .from("recipes")
          .select("id, title as name, description, prep_time, cook_time, servings")
          .eq("user_id", user?.id)

        if (titleError) {
          throw titleError
        }
        data = titleData
      } else if (error) {
        throw error
      }

      setRecipes(data || [])
    } catch (error) {
      console.error("Error loading recipes:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las recetas",
        variant: "destructive",
      })
    }
  }

  const assignRecipe = async (day: string, meal: string, recipe: Recipe) => {
    try {
      // First, get or create weekly menu
      const { data: weeklyMenuData, error: menuError } = await supabase
        .from("weekly_menus")
        .select("id")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)

      let menuId: string

      if (menuError || !weeklyMenuData || weeklyMenuData.length === 0) {
        // Create new weekly menu
        const { data: newMenu, error: createError } = await supabase
          .from("weekly_menus")
          .insert({
            user_id: user?.id,
            week_start: new Date().toISOString().split("T")[0],
          })
          .select("id")
          .single()

        if (createError) throw createError
        menuId = newMenu.id
      } else {
        menuId = weeklyMenuData[0].id
      }

      // Upsert the menu item
      const { error: itemError } = await supabase.from("weekly_menu_items").upsert({
        weekly_menu_id: menuId,
        day,
        meal,
        recipe_id: recipe.id,
      })

      if (itemError) throw itemError

      // Update local state
      setWeeklyMenu((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: recipe,
        },
      }))

      setSelectedSlot(null)

      toast({
        title: "Éxito",
        description: `${recipe.name} asignada a ${DAYS.find((d) => d.key === day)?.label} - ${
          MEALS.find((m) => m.key === meal)?.label
        }`,
      })
    } catch (error) {
      console.error("Error assigning recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar la receta",
        variant: "destructive",
      })
    }
  }

  const removeRecipe = async (day: string, meal: string) => {
    try {
      const { error } = await supabase
        .from("weekly_menu_items")
        .delete()
        .match({
          day,
          meal,
          weekly_menu_id: (
            await supabase
              .from("weekly_menus")
              .select("id")
              .eq("user_id", user?.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()
          ).data?.id,
        })

      if (error) throw error

      // Update local state
      setWeeklyMenu((prev) => ({
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: null,
        },
      }))

      toast({
        title: "Éxito",
        description: "Receta eliminada del menú",
      })
    } catch (error) {
      console.error("Error removing recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {DAYS.map((day) => (
          <Card key={day.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {MEALS.map((meal) => (
                  <div key={meal.key} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{meal.label}</h4>
                    <div className="min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg p-3 flex items-center justify-center">
                      {weeklyMenu[day.key]?.[meal.key] ? (
                        <div className="text-center space-y-2 w-full">
                          <p className="font-medium text-sm">{weeklyMenu[day.key][meal.key]?.name}</p>
                          {weeklyMenu[day.key][meal.key]?.description && (
                            <p className="text-xs text-muted-foreground">
                              {weeklyMenu[day.key][meal.key]?.description}
                            </p>
                          )}
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSlot({ day: day.key, meal: meal.key })}
                            >
                              Cambiar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => removeRecipe(day.key, meal.key)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full h-full"
                          onClick={() => setSelectedSlot({ day: day.key, meal: meal.key })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir receta
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recipe Selection Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle>
                Seleccionar receta para {DAYS.find((d) => d.key === selectedSlot.day)?.label} -{" "}
                {MEALS.find((m) => m.key === selectedSlot.meal)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto">
              {recipes.length === 0 ? (
                <p className="text-center text-muted-foreground">No hay recetas disponibles</p>
              ) : (
                recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => assignRecipe(selectedSlot.day, selectedSlot.meal, recipe)}
                  >
                    <h4 className="font-medium">{recipe.name}</h4>
                    {recipe.description && <p className="text-sm text-muted-foreground">{recipe.description}</p>}
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      {recipe.prep_time && <span>Prep: {recipe.prep_time}min</span>}
                      {recipe.cook_time && <span>Cocción: {recipe.cook_time}min</span>}
                      {recipe.servings && <span>Porciones: {recipe.servings}</span>}
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
