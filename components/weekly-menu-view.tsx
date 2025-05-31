"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Loader2, RefreshCw, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { WeeklyMenu, MenuItem, Recipe } from "@/lib/types"

interface WeeklyMenuViewProps {
  weeklyMenu: WeeklyMenu | null
  menuItems: MenuItem[]
  initialRecipes: Recipe[]
  startDate: string
  onDataUpdate?: () => void
}

export function WeeklyMenuView({
  weeklyMenu,
  menuItems,
  initialRecipes,
  startDate,
  onDataUpdate,
}: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecipes = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/recipes")
      if (!response.ok) {
        throw new Error("Failed to fetch recipes")
      }
      const data = await response.json()
      setRecipes(data)
    } catch (err) {
      setError("Error fetching recipes")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando recetas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-red-600">Error: {error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Menú Semanal desde {startDate}</h2>
      {menuItems.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <div>
            <Label>
              {item.day_of_week} - {item.meal_type}
            </Label>
            <p>{item.recipe.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => console.log("Ver detalles")}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => console.log("Editar")}>
              Editar
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={onDataUpdate}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Recargar Datos
      </Button>
    </div>
  )
}
