"use client"
import { useState, useEffect } from "react"
import { Plus } from "lucide-react"

import { Trash2, Sparkles, Calendar, Clock, Users } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import type { Recipe as RecipeType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

import { useSession } from "@/hooks/use-session"

interface MenuEntry {
  day: string
  meal: "lunch" | "dinner"
  recipe_id: string | null
  recipe?: RecipeType
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEALS = { lunch: "Comida", dinner: "Cena" }

export default function WeeklyMenuView() {
  const [mounted, setMounted] = useState(false)
  const [recipes, setRecipes] = useState<RecipeType[]>([])
  const [menu, setMenu] = useState<MenuEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()
  const { user, loading: sessionLoading } = useSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!sessionLoading) {
      setAuthLoading(false)
      if (user) {
        loadData()
      } else {
        setLoading(false)
      }
    }
  }, [user, sessionLoading])

  const loadData = async () => {
    if (!user) {
      console.log("No user found, skipping data load")
      setLoading(false)
      return
    }

    try {
      console.log("Loading data for user:", user.id)
      setLoading(true)

      const supabase = createClient()

      // Load recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from("recipes")
        .select("id, name, category, prep_time, servings, difficulty")
        .eq("user_id", user.id)
        .order("name")

      if (recipesError) {
        console.error("Error loading recipes:", recipesError)
        throw recipesError
      }

      console.log("Loaded recipes:", recipesData?.length || 0)
      setRecipes(recipesData || [])

      // Load current week menu
      const startOfWeek = getStartOfWeek()
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)

      const { data: menuData, error: menuError } = await supabase
        .from("weekly_menus")
        .select(`
          day,
          meal,
          recipe_id,
          recipes (
            id,
            name,
            category,
            prep_time,
            servings,
            difficulty
          )
        `)
        .eq("user_id", user.id)
        .gte("week_start", startOfWeek.toISOString().split("T")[0])
        .lte("week_start", endOfWeek.toISOString().split("T")[0])

      if (menuError) {
        console.error("Error loading menu:", menuError)
        throw menuError
      }

      console.log("Loaded menu entries:", menuData?.length || 0)

      // Initialize menu with all days and meals
      const initialMenu: MenuEntry[] = []
      DAYS.forEach((day) => {
        ;["lunch", "dinner"].forEach((meal) => {
          const existingEntry = menuData?.find((m) => m.day === day && m.meal === meal)
          initialMenu.push({
            day,
            meal: meal as "lunch" | "dinner",
            recipe_id: existingEntry?.recipe_id || null,
            recipe: existingEntry?.recipes || undefined,
          })
        })
      })

      setMenu(initialMenu)
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStartOfWeek = () => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday as start of week
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const updateMenuEntry = async (day: string, meal: "lunch" | "dinner", recipeId: string | null) => {
    if (!user) return

    try {
      const supabase = createClient()
      const startOfWeek = getStartOfWeek()

      if (recipeId) {
        // Add or update menu entry
        const { error } = await supabase.from("weekly_menus").upsert({
          user_id: user.id,
          day,
          meal,
          recipe_id: recipeId,
          week_start: startOfWeek.toISOString().split("T")[0],
        })

        if (error) throw error

        // Update local state
        const recipe = recipes.find((r) => r.id === recipeId)
        setMenu((prev) =>
          prev.map((entry) =>
            entry.day === day && entry.meal === meal ? { ...entry, recipe_id: recipeId, recipe } : entry,
          ),
        )
      } else {
        // Remove menu entry
        const { error } = await supabase
          .from("weekly_menus")
          .delete()
          .eq("user_id", user.id)
          .eq("day", day)
          .eq("meal", meal)
          .eq("week_start", startOfWeek.toISOString().split("T")[0])

        if (error) throw error

        // Update local state
        setMenu((prev) =>
          prev.map((entry) =>
            entry.day === day && entry.meal === meal ? { ...entry, recipe_id: null, recipe: undefined } : entry,
          ),
        )
      }

      toast({
        title: "Menú actualizado",
        description: "Los cambios se han guardado correctamente.",
      })
    } catch (error) {
      console.error("Error updating menu:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el menú. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  const generateMenu = async () => {
    if (!user) return

    try {
      setGenerating(true)

      const response = await fetch("/api/generate-menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          preferences: {
            variety: true,
            balanced: true,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate menu")
      }

      const result = await response.json()

      if (result.success) {
        await loadData() // Reload data to show the new menu
        toast({
          title: "Menú generado",
          description: "Se ha creado un nuevo menú semanal automáticamente.",
        })
      } else {
        throw new Error(result.error || "Failed to generate menu")
      }
    } catch (error) {
      console.error("Error generating menu:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el menú automáticamente. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const clearMenu = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const startOfWeek = getStartOfWeek()

      const { error } = await supabase
        .from("weekly_menus")
        .delete()
        .eq("user_id", user.id)
        .eq("week_start", startOfWeek.toISOString().split("T")[0])

      if (error) throw error

      // Clear local state
      setMenu((prev) =>
        prev.map((entry) => ({
          ...entry,
          recipe_id: null,
          recipe: undefined,
        })),
      )

      toast({
        title: "Menú limpiado",
        description: "Se ha eliminado todo el menú de la semana.",
      })
    } catch (error) {
      console.error("Error clearing menu:", error)
      toast({
        title: "Error",
        description: "No se pudo limpiar el menú. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  if (!mounted) {
    return null
  }

  if (authLoading || sessionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Menú Semanal</h1>
          <p className="text-muted-foreground mb-4">Necesitas iniciar sesión para ver tu menú semanal.</p>
          <Button asChild>
            <a href="/login">Iniciar Sesión</a>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Menú Semanal</h1>
          <p className="text-muted-foreground">Planifica tus comidas para la semana</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateMenu}
            disabled={generating || recipes.length === 0}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generando..." : "Generar Menú"}
          </Button>
          <Button onClick={clearMenu} variant="outline" className="flex items-center gap-2 bg-transparent">
            <Trash2 className="h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      {recipes.length === 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                No tienes recetas guardadas. Añade algunas recetas para poder crear tu menú semanal.
              </p>
              <Button asChild>
                <a href="/recipes/add">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Primera Receta
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="grid md:grid-cols-2 gap-4">
                {(["lunch", "dinner"] as const).map((meal) => {
                  const entry = menu.find((m) => m.day === day && m.meal === meal)
                  const selectedRecipe = entry?.recipe

                  return (
                    <div key={meal} className="space-y-2">
                      <h4 className="font-medium">{MEALS[meal]}</h4>
                      <Select
                        value={entry?.recipe_id || "none"}
                        onValueChange={(value) => updateMenuEntry(day, meal, value === "none" ? null : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar receta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin receta</SelectItem>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedRecipe && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary">{selectedRecipe.category}</Badge>
                          {selectedRecipe.prep_time && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {selectedRecipe.prep_time} min
                            </Badge>
                          )}
                          {selectedRecipe.servings && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {selectedRecipe.servings} pers.
                            </Badge>
                          )}
                          {selectedRecipe.difficulty && <Badge variant="outline">{selectedRecipe.difficulty}</Badge>}
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
    </div>
  )
}
