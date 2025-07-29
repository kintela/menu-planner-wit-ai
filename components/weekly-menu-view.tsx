"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChefHat, Flame, Users, Trash2, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { RecipeSelector } from "./recipe-selector"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
  user_profiles?: {
    full_name?: string
    first_name?: string
  }
}

interface MenuEntry {
  id?: number
  day: string
  meal_type: string
  dish_order: number
  recipe_id: number
  recipe?: Recipe
}

interface WeeklyMenuViewProps {
  initialRecipes?: Recipe[]
  userId: string // Necesitamos el userId
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "comida", order: 1, label: "Primer plato", color: "border-blue-300 bg-blue-50" },
  { key: "comida", order: 2, label: "Segundo plato", color: "border-green-300 bg-green-50" },
  { key: "cena", order: 1, label: "Cena", color: "border-orange-300 bg-orange-50" },
]

export const WeeklyMenuView = React.memo(function WeeklyMenuView({ initialRecipes = [], userId }: WeeklyMenuViewProps) {
  // Memorizar las recetas para evitar re-renders
  const recipes = useMemo(() => initialRecipes, [initialRecipes.length]);
  
  // Estados necesarios
  const [menuEntries, setMenuEntries] = useState<MenuEntry[]>([])
  const [showRecipeSelector, setShowRecipeSelector] = useState<{
    day: string
    mealType: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [weekDates, setWeekDates] = useState<{startDate: string, endDate: string, weekText: string}>({
    startDate: '',
    endDate: '',
    weekText: ''
  })

  const supabase = createClient()

  // Calcular fechas de la semana actual al montar el componente
  useEffect(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lunes
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const startDateStr = startOfWeek.toISOString().split('T')[0]
    const endDateStr = endOfWeek.toISOString().split('T')[0]
    
    // Crear texto descriptivo de la semana
    const weekText = `${startOfWeek.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long' 
    })} - ${endOfWeek.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })}`

    setWeekDates({ startDateStr, endDateStr, weekText })
    console.log("📅 Semana actual:", weekText)
  }, [])

  // Función para añadir receta (solo en memoria)
  const addRecipeToMenu = (day: string, mealTypeKey: string, recipeId: number) => {
    const recipe = recipes.find(r => r.id === recipeId)
    if (!recipe) return

    // Parsear el mealType para obtener meal_type y dish_order
    const [meal_type, orderStr] = mealTypeKey.split('-')
    const dish_order = parseInt(orderStr)
    
    // Añadir al estado local (sin BD por ahora)
    const newEntry: MenuEntry = {
      id: Date.now(), // ID temporal
      day,
      meal_type,
      dish_order,
      recipe_id: recipeId,
      recipe
    }
    
    setMenuEntries(prev => [...prev, newEntry])
    setShowRecipeSelector(null)
    
    console.log("✅ Receta añadida a memoria:", recipe.name)
  }

  // Función para eliminar receta (solo de memoria)
  const removeRecipeFromMenu = (entryId: number) => {
    setMenuEntries(prev => prev.filter(entry => entry.id !== entryId))
    console.log("✅ Receta eliminada de memoria")
  }

  // Función para guardar todo el menú en la base de datos
  const saveWeeklyMenu = async () => {
    if (menuEntries.length === 0) {
      console.log("⚠️ No hay recetas para guardar")
      return
    }

    setIsSaving(true)
    try {
      console.log("💾 Guardando menú semanal...")

      // 1. Crear el weekly_menu
      const { data: weeklyMenu, error: menuError } = await supabase
        .from("weekly_menus")
        .insert({
          name: `Menú ${weekDates.weekText}`,
          start_date: weekDates.startDateStr,
          end_date: weekDates.endDateStr,
          user_id: userId,
          is_saved: true
        })
        .select()
        .single()

      if (menuError) {
        console.error("❌ Error creando menú semanal:", menuError)
        throw menuError
      }

      console.log("✅ Menú semanal creado con ID:", weeklyMenu.id)

      // 2. Crear todos los menu_items usando el ID del menú recién creado
      const menuItemsToInsert = menuEntries.map(entry => ({
        weekly_menu_id: weeklyMenu.id,
        recipe_id: entry.recipe_id,
        day_of_week: DAYS.indexOf(entry.day),
        meal_type: entry.meal_type,
        dish_order: entry.dish_order
      }))

      const { error: itemsError } = await supabase
        .from("menu_items")
        .insert(menuItemsToInsert)

      if (itemsError) {
        console.error("❌ Error creando items del menú:", itemsError)
        // Si falla, eliminar el weekly_menu creado
        await supabase.from("weekly_menus").delete().eq("id", weeklyMenu.id)
        throw itemsError
      }

      console.log("✅ Items del menú guardados:", menuItemsToInsert.length)
      console.log("🎉 Menú semanal guardado exitosamente!")

      // Opcional: Limpiar el estado local después de guardar
      // setMenuEntries([])
      
    } catch (error) {
      console.error("❌ Error guardando menú:", error)
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* DEBUG: Información básica */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Recetas disponibles: {recipes.length}</p>
          <p>Recetas en menú: {menuEntries.length}</p>
          <p>Selector activo: {showRecipeSelector ? 'Sí' : 'No'}</p>
        </CardContent>
      </Card>

      {/* Estadísticas del menú */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Total Calorías</p>
                <p className="text-2xl font-bold">
                  {menuEntries.reduce((total, entry) => total + (entry.recipe?.calories || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Recetas Añadidas</p>
                <p className="text-2xl font-bold">{menuEntries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Días con Comida</p>
                <p className="text-2xl font-bold">
                  {new Set(menuEntries.map(entry => entry.day)).size}/7
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planificador semanal completo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificador Semanal
            </CardTitle>
            {/* Botón para guardar menú semanal */}
            <Button
              onClick={saveWeeklyMenu}
              disabled={menuEntries.length === 0 || isSaving}
              size="sm"
              className="shrink-0"
            >
              {isSaving ? "Guardando..." : "Guardar Menú"}
            </Button>
          </div>
          {weekDates.weekText && (
            <p className="text-sm text-gray-600 mt-1">
              Semana del {weekDates.weekText}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {DAYS.map((day) => (
              <div key={day} className="space-y-3">
                <h3 className="font-semibold text-center text-sm">{day}</h3>
                {MEAL_TYPES.map((mealType) => {
                  const entry = menuEntries.find(entry => 
                    entry.day === day && 
                    entry.meal_type === mealType.key && 
                    entry.dish_order === mealType.order
                  );
                  return (
                    <div
                      key={`${day}-${mealType.key}-${mealType.order}`}
                      className={`border-2 rounded-lg p-3 min-h-[120px] ${mealType.color}`}
                    >
                      <p className="text-xs font-medium mb-2">{mealType.label}</p>
                      {entry?.recipe ? (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-2">{entry.recipe.name}</p>
                              {entry.recipe.calories && (
                                <p className="text-xs text-gray-600">{entry.recipe.calories} cal</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.id && removeRecipeFromMenu(entry.id)}
                              className="h-6 w-6 p-0 ml-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log("🔍 Botón +Añadir clickeado para:", day, `${mealType.key}-${mealType.order}`);
                            setShowRecipeSelector({ day, mealType: `${mealType.key}-${mealType.order}` });
                          }}
                          className="w-full h-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                        >
                          <Plus className="h-4 w-4 mb-1" />
                          <span className="text-xs">Añadir</span>
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selector de recetas con el nuevo componente */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <RecipeSelector
            recipes={recipes}
            day={showRecipeSelector.day}
            mealType={showRecipeSelector.mealType}
            onSelect={(recipeId) => addRecipeToMenu(showRecipeSelector.day, showRecipeSelector.mealType, recipeId)}
            onCancel={() => setShowRecipeSelector(null)}
          />
        </div>
      )}
    </div>
  )
})
