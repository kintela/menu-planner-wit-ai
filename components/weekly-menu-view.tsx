"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Recipe } from "@/lib/types"

interface WeeklyMenuViewProps {
  userId: string
}

export function WeeklyMenuView({ userId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecipes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setRecipes(data || [])
    } catch (error: any) {
      console.error("Error loading recipes:", error)
      setError(`Error loading recipes: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadRecipes()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-600">{error}</div>
        <Button onClick={loadRecipes}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Mi Menú Semanal</h1>
        <p className="text-muted-foreground">Planifica tus comidas y cenas para toda la semana</p>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-sm">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="text-xs font-medium">Comida</div>
                <div className="min-h-[60px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                  Añadir receta
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium">Cena</div>
                <div className="min-h-[60px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                  Añadir receta
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button>Guardar Menú</Button>
      </div>

      {recipes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Mis Recetas Disponibles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-medium">{recipe.name}</h3>
                  {recipe.description && <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyMenuView
