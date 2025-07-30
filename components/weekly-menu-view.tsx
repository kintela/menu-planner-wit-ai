"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChefHat, Flame, Users, Trash2, Plus, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { RecipeSelector } from "./recipe-selector"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface Recipe {
  id: number
  name: string
  calories?: number
  image_url?: string
  user_profiles?: {
    id?: string
    full_name?: string
    first_name?: string
    last_name?: string
    alias?: string
    avatar_url?: string
    email?: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [existingMenuId, setExistingMenuId] = useState<number | null>(null)
  const [weekDates, setWeekDates] = useState<{startDateStr: string, endDateStr: string, weekText: string}>({
    startDateStr: '',
    endDateStr: '',
    weekText: ''
  })

  const supabase = createClient()
  const { toast } = useToast()

  // Calcular fechas de la semana actual y cargar menú existente
  useEffect(() => {
    const initializeWeekAndLoadMenu = async () => {
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
      
      // Crear texto descriptivo de la semana en formato DD/MM/YYYY
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }

      const weekText = `${formatDate(startOfWeek)} al ${formatDate(endOfWeek)}`

      setWeekDates({ startDateStr, endDateStr, weekText })

      // Buscar menú existente para esta semana
      await loadExistingMenu(startDateStr, endDateStr)
    }

    if (userId) {
      initializeWeekAndLoadMenu()
    }
  }, [userId])

  // Función para cargar menú existente si ya existe
  const loadExistingMenu = async (startDateStr: string, endDateStr: string) => {
    try {
      // Verificar que tenemos userId antes de hacer la consulta
      if (!userId) {
        setIsLoading(false)
        return
      }

      // Buscar menú existente para esta semana
      const { data: existingMenu, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", userId)
        .eq("start_date", startDateStr)
        .single()

      if (menuError && menuError.code !== "PGRST116") {
        console.error("Error buscando menú existente:", menuError)
        setIsLoading(false)
        return
      }

      if (existingMenu) {
        setExistingMenuId(existingMenu.id)

        // Cargar items del menú existente
        const { data: menuItems, error: itemsError } = await supabase
          .from("menu_items")
          .select(`
            id,
            day_of_week,
            meal_type,
            dish_order,
            recipe_id,
            recipes (
              id,
              name,
              calories,
              image_url,
              user_profiles (
                id,
                full_name,
                first_name,
                last_name,
                alias,
                avatar_url,
                email
              )
            )
          `)
          .eq("weekly_menu_id", existingMenu.id)
          .order("day_of_week")
          .order("meal_type")
          .order("dish_order")

        if (itemsError) {
          console.error("Error cargando items del menú:", itemsError)
          setMenuEntries([])
        } else {
          if (menuItems && menuItems.length > 0) {
            const formattedEntries = menuItems.map((entry) => ({
              id: entry.id,
              day: DAYS[entry.day_of_week],
              meal_type: entry.meal_type,
              dish_order: entry.dish_order,
              recipe_id: entry.recipe_id,
              recipe: entry.recipes ? {
                id: (entry.recipes as any).id,
                name: (entry.recipes as any).name,
                calories: (entry.recipes as any).calories,
                image_url: (entry.recipes as any).image_url,
                user_profiles: (entry.recipes as any).user_profiles || null
              } : undefined
            }))
            setMenuEntries(formattedEntries)
          } else {
            setMenuEntries([])
          }
        }
      } else {
        setExistingMenuId(null)
        setMenuEntries([])
      }
    } catch (error) {
      console.error("Error en loadExistingMenu:", error)
      setExistingMenuId(null)
      setMenuEntries([])
    } finally {
      setIsLoading(false)
    }
  }

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
  }

  // Función para eliminar receta (solo de memoria)
  const removeRecipeFromMenu = (entryId: number) => {
    setMenuEntries(prev => prev.filter(entry => entry.id !== entryId))
  }

  // Función para guardar todo el menú en la base de datos
  const saveWeeklyMenu = async () => {
    if (menuEntries.length === 0) {
      toast({
        title: "Menú vacío",
        description: "Agrega al menos una receta antes de guardar el menú.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      console.log("Guardando menú semanal...")

      let menuId = existingMenuId

      // Si no existe menú, crearlo
      if (!existingMenuId) {
        const { data: weeklyMenu, error: menuError } = await supabase
          .from("weekly_menus")
          .insert({
            name: `Menú del ${weekDates.weekText}`,
            start_date: weekDates.startDateStr,
            end_date: weekDates.endDateStr,
            user_id: userId,
            is_saved: true
          })
          .select()
          .single()

        if (menuError) {
          console.error("Error creando menú semanal:", menuError)
          throw menuError
        }

        menuId = weeklyMenu.id
        setExistingMenuId(menuId)
        console.log("Menú semanal creado con ID:", menuId)
      } else {
        console.log("Usando menú existente con ID:", menuId)
        
        // Eliminar items existentes para reemplazarlos
        const { error: deleteError } = await supabase
          .from("menu_items")
          .delete()
          .eq("weekly_menu_id", menuId)

        if (deleteError) {
          console.error("Error eliminando items existentes:", deleteError)
          throw deleteError
        }
        console.log("Items existentes eliminados")
      }

      // Crear todos los menu_items usando el ID del menú
      const menuItemsToInsert = menuEntries
        .filter(entry => entry.recipe_id) // Solo entries con recetas válidas
        .map(entry => ({
          weekly_menu_id: menuId,
          recipe_id: entry.recipe_id,
          day_of_week: DAYS.indexOf(entry.day),
          meal_type: entry.meal_type,
          dish_order: entry.dish_order
        }))

      if (menuItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("menu_items")
          .insert(menuItemsToInsert)

        if (itemsError) {
          console.error("Error creando items del menú:", itemsError)
          throw itemsError
        }

        console.log("Items del menú guardados:", menuItemsToInsert.length)
      }

      console.log("Menú semanal guardado exitosamente!")

      // Mostrar toast de éxito
      toast({
        title: "¡Menú guardado!",
        description: `Tu menú semanal del ${weekDates.weekText} se ha guardado correctamente.`,
      })

      // Recargar el menú para obtener los IDs reales de la BD
      await loadExistingMenu(weekDates.startDateStr, weekDates.endDateStr)
      
    } catch (error) {
      console.error("Error guardando menú:", error)
      
      // Mostrar toast de error
      toast({
        title: "Error al guardar el menú",
        description: "No se pudo guardar el menú semanal. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Función para obtener receta de un día/comida específica
  const getMenuEntry = (day: string, mealType: string, dishOrder: number) => {
    return menuEntries.find(entry => 
      entry.day === day && 
      entry.meal_type === mealType && 
      entry.dish_order === dishOrder
    );
  };

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Cargando planificador semanal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
                      className={`border-2 rounded-lg p-3 h-[180px] ${mealType.color}`}
                    >
                      <p className="text-xs font-medium mb-2">{mealType.label}</p>
                      {entry?.recipe ? (
                        <div className="h-full flex flex-col">
                          <div className="flex items-start gap-2 flex-1">
                            {/* Imagen en miniatura */}
                            <div className="flex-shrink-0">
                              {entry.recipe.image_url ? (
                                <img
                                  src={entry.recipe.image_url}
                                  alt={entry.recipe.name}
                                  className="w-10 h-10 object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                                  <ChefHat className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Información de la receta */}
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium line-clamp-2 mb-1 leading-tight">{entry.recipe.name}</p>
                              
                              {/* Autor de la receta con el mismo estilo que RecipeCard */}
                              {entry.recipe.user_profiles && (
                                <div className="flex items-center gap-1 mb-1 text-xs bg-black/60 text-white backdrop-blur-sm rounded px-2 py-1 w-fit">
                                  {entry.recipe.user_profiles.avatar_url ? (
                                    <Image
                                      src={entry.recipe.user_profiles.avatar_url}
                                      alt="Avatar"
                                      width={12}
                                      height={12}
                                      className="h-3 w-3 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <User className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {entry.recipe.user_profiles.alias || 
                                     entry.recipe.user_profiles.full_name || 
                                     (entry.recipe.user_profiles.first_name && entry.recipe.user_profiles.last_name 
                                       ? `${entry.recipe.user_profiles.first_name} ${entry.recipe.user_profiles.last_name}` 
                                       : entry.recipe.user_profiles.first_name) ||
                                     'Usuario'}
                                  </span>
                                </div>
                              )}
                              
                              {/* Calorías */}
                              {entry.recipe.calories && (
                                <div className="flex items-center gap-1">
                                  <Flame className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">{entry.recipe.calories} cal</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botón eliminar - posicionado en la parte inferior */}
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.id && removeRecipeFromMenu(entry.id)}
                              className="h-6 w-6 p-0 flex-shrink-0"
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
