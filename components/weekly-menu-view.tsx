"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import Link from "next/link"

import { Loader2, RefreshCw, Eye, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { getSupabaseClient } from "@/lib/supabase/client"
import type { WeeklyMenu, MenuItem, Recipe, DayMenu } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { AiRecipeSuggestion } from "@/components/ai-recipe-suggestion"

import { useAuth } from "@/components/auth/auth-provider"

interface WeeklyMenuViewProps {
  weeklyMenu: WeeklyMenu | null
  menuItems: MenuItem[]
  initialRecipes: Recipe[]
  startDate: string
  onDataUpdate?: () => void
  menuHistory?: WeeklyMenu[]
  onMenuSelect?: (menu: WeeklyMenu) => void
  onWeekChange?: (newStartDate: string) => void
}

// Función para formatear fechas de yyyy-mm-dd a dd/mm/yyyy
const formatDateToDDMMYYYY = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES")
}

// Función para generar el nombre del menú con fechas formateadas
const getFormattedMenuName = (menu: WeeklyMenu): string => {
  return `Menú del ${formatDateToDDMMYYYY(menu.start_date)} al ${formatDateToDDMMYYYY(menu.end_date)}`
}

// Función para obtener el inicio de la semana actual
const getCurrentWeekStart = (): string => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - daysToSubtract)
  return startOfWeek.toISOString().split("T")[0]
}

// Función para obtener el inicio de la semana siguiente
const getNextWeekStart = (): string => {
  const currentWeekStart = new Date(getCurrentWeekStart())
  const nextWeekStart = new Date(currentWeekStart)
  nextWeekStart.setDate(currentWeekStart.getDate() + 7)
  return nextWeekStart.toISOString().split("T")[0]
}

export function WeeklyMenuView({
  weeklyMenu: initialWeeklyMenu,
  menuItems: initialMenuItems,
  initialRecipes,
  startDate,
  onDataUpdate,
  menuHistory = [],
  onMenuSelect,
  onWeekChange,
}: WeeklyMenuViewProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(initialWeeklyMenu)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems)
  const [currentStartDate, setCurrentStartDate] = useState<string>(startDate)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Determinar si estamos viendo la semana actual o la siguiente
  const currentWeekStart = getCurrentWeekStart()
  const nextWeekStart = getNextWeekStart()
  const isCurrentWeek = currentStartDate === currentWeekStart
  const isNextWeek = currentStartDate === nextWeekStart

  // Actualizar estados cuando cambien las props
  useEffect(() => {
    console.log("📥 Actualizando recetas desde props, total:", initialRecipes.length)
    setRecipes(initialRecipes)
  }, [initialRecipes])

  useEffect(() => {
    setWeeklyMenu(initialWeeklyMenu)
  }, [initialWeeklyMenu])

  useEffect(() => {
    setMenuItems(initialMenuItems)
  }, [initialMenuItems])

  useEffect(() => {
    setCurrentStartDate(startDate)
  }, [startDate])

  // Preparar los datos del menú por día
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  const daysMenu: DayMenu[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentStartDate)
    date.setDate(date.getDate() + i)

    return {
      day: i,
      dayName: dayNames[i],
      date: date.toISOString().split("T")[0],
      meals: {
        comida: [], // Array vacío para múltiples platos
        cena: null, // Un solo plato
      },
    }
  })

  // Rellenar con los platos existentes
  menuItems.forEach((item) => {
    if (item.recipe && daysMenu[item.day_of_week]) {
      if (item.meal_type === "comida") {
        // Para comida, añadir al array en el orden correcto (dish_order es 1-based)
        const index = item.dish_order - 1
        if (index >= 0 && index < 2) {
          daysMenu[item.day_of_week].meals.comida[index] = item.recipe as Recipe
        }
      } else if (item.meal_type === "cena") {
        // Para cena, solo un plato
        daysMenu[item.day_of_week].meals.cena = item.recipe as Recipe
      }
    }
  })

  // Asegurar que el array de comida tenga exactamente 2 elementos
  daysMenu.forEach((day) => {
    while (day.meals.comida.length < 2) {
      day.meals.comida.push(null as any)
    }
  })

  const handleWeekChangeLocal = async (targetWeek: "current" | "next") => {
    const newStartDate = targetWeek === "current" ? currentWeekStart : nextWeekStart

    if (newStartDate === currentStartDate) return

    // Llamar al callback del componente padre para cambiar la semana
    if (onWeekChange) {
      onWeekChange(newStartDate)
    }
  }

  const handleRecipeChange = async (
    dayOfWeek: number,
    mealType: "comida" | "cena",
    recipeId: string,
    dishOrder?: number,
  ) => {
    if (!recipeId) return

    setIsUpdating(true)

    try {
      const supabase = getSupabaseClient()

      // Asegurar que tenemos un menú semanal
      let currentWeeklyMenu = weeklyMenu
      if (!currentWeeklyMenu) {
        console.log("⚠️ No hay menú semanal, esto no debería pasar")

        // Calcular la fecha de fin
        const endDateStr = new Date(new Date(currentStartDate).getTime() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]

        // Buscar menú existente primero
        const { data: existingMenu } = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("start_date", currentStartDate)
          .eq("end_date", endDateStr)
          .eq("user_id", user?.id)
          .maybeSingle()

        if (existingMenu) {
          currentWeeklyMenu = existingMenu
          setWeeklyMenu(currentWeeklyMenu)
          console.log("✅ Menú existente encontrado y establecido")
        } else {
          // Solo crear si realmente no existe
          console.log("📝 Creando menú porque no existe")
          const { data: newMenu, error: createError } = await supabase
            .from("weekly_menus")
            .insert({
              name: `Menú del ${formatDateToDDMMYYYY(currentStartDate)} al ${formatDateToDDMMYYYY(endDateStr)}`,
              start_date: currentStartDate,
              end_date: endDateStr,
              user_id: user?.id,
              is_saved: false,
            })
            .select()
            .single()

          if (createError) {
            throw createError
          }
          currentWeeklyMenu = newMenu
          setWeeklyMenu(currentWeeklyMenu)
        }
      }

      // Encontrar la receta seleccionada
      const selectedRecipe = recipes.find((r) => r.id.toString() === recipeId)

      if (mealType === "comida") {
        // Para comida, necesitamos manejar ambos platos juntos debido a la restricción única
        const finalDishOrder = dishOrder || 1

        try {
          // Buscar si ya existe un plato para este día y tipo específico
          const { data: existingItem } = await supabase
            .from("menu_items")
            .select("*")
            .eq("weekly_menu_id", currentWeeklyMenu.id)
            .eq("day_of_week", dayOfWeek)
            .eq("meal_type", "comida")
            .eq("dish_order", finalDishOrder)
            .maybeSingle()

          if (existingItem) {
            // Actualizar el plato existente
            await supabase
              .from("menu_items")
              .update({ recipe_id: Number.parseInt(recipeId) })
              .eq("id", existingItem.id)

            // Actualizar el estado local inmediatamente
            const updatedMenuItems = menuItems.map((item) =>
              item.id === existingItem.id
                ? { ...item, recipe_id: Number.parseInt(recipeId), recipe: selectedRecipe }
                : item,
            )
            setMenuItems(updatedMenuItems)
          } else {
            // Crear un nuevo plato
            const { data: newItem, error: insertError } = await supabase
              .from("menu_items")
              .insert({
                weekly_menu_id: currentWeeklyMenu.id,
                recipe_id: Number.parseInt(recipeId),
                day_of_week: dayOfWeek,
                meal_type: "comida",
                dish_order: finalDishOrder,
              })
              .select()
              .single()

            if (insertError) {
              throw insertError
            }

            if (newItem) {
              // Añadir al estado local inmediatamente con la receta completa
              const newMenuItemWithRecipe = {
                ...newItem,
                recipe: selectedRecipe,
              } as MenuItem
              setMenuItems((prevItems) => [...prevItems, newMenuItemWithRecipe])
            }
          }
        } catch (error) {
          console.error("Error updating menu item:", error)
          throw error
        }
      } else {
        // Para cena, usar la lógica original ya que solo hay un plato
        const { data: existingItem } = await supabase
          .from("menu_items")
          .select("*")
          .eq("weekly_menu_id", currentWeeklyMenu.id)
          .eq("day_of_week", dayOfWeek)
          .eq("meal_type", "cena")
          .maybeSingle()

        if (existingItem) {
          // Actualizar el plato existente
          await supabase
            .from("menu_items")
            .update({ recipe_id: Number.parseInt(recipeId) })
            .eq("id", existingItem.id)

          // Actualizar el estado local inmediatamente
          const updatedMenuItems = menuItems.map((item) =>
            item.id === existingItem.id
              ? { ...item, recipe_id: Number.parseInt(recipeId), recipe: selectedRecipe }
              : item,
          )
          setMenuItems(updatedMenuItems)
        } else {
          // Crear un nuevo plato
          const { data: newItem, error: insertError } = await supabase
            .from("menu_items")
            .insert({
              weekly_menu_id: currentWeeklyMenu.id,
              recipe_id: Number.parseInt(recipeId),
              day_of_week: dayOfWeek,
              meal_type: "cena",
              dish_order: 1,
            })
            .select()
            .single()

          if (insertError) {
            throw insertError
          }

          if (newItem) {
            // Añadir al estado local inmediatamente con la receta completa
            const newMenuItemWithRecipe = {
              ...newItem,
              recipe: selectedRecipe,
            } as MenuItem
            setMenuItems((prevItems) => [...prevItems, newMenuItemWithRecipe])
          }
        }
      }

      // Marcar el menú como guardado cuando se añade la primera receta (solo si no estaba guardado)
      if (currentWeeklyMenu && !currentWeeklyMenu.is_saved) {
        await supabase
          .from("weekly_menus")
          .update({
            is_saved: true,
            saved_at: new Date().toISOString(),
          })
          .eq("id", currentWeeklyMenu.id)

        // Actualizar el estado local
        setWeeklyMenu({ ...currentWeeklyMenu, is_saved: true, saved_at: new Date().toISOString() })

        toast({
          title: "Menú guardado",
          description: "El menú se ha guardado automáticamente al añadir la primera receta.",
        })
      } else {
        toast({
          title: "Menú actualizado",
          description: "El menú se ha actualizado correctamente.",
        })
      }

      console.log("✅ Receta actualizada correctamente")
    } catch (error) {
      console.error("Error updating menu:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al actualizar el menú.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGenerateMenu = async () => {
    setIsGenerating(true)

    try {
      const supabase = getSupabaseClient()

      // Si no existe un menú semanal, crearlo primero
      let currentWeeklyMenu = weeklyMenu
      if (!currentWeeklyMenu) {
        // Calcular la fecha de fin para mostrar en el título
        const endDateStr = new Date(new Date(currentStartDate).getTime() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]

        // Buscar menú existente primero
        const { data: existingMenu } = await supabase
          .from("weekly_menus")

          .select("*")
          .eq("start_date", currentStartDate)
          .eq("end_date", endDateStr)
          .eq("user_id", user?.id)
          .maybeSingle()

        if (existingMenu) {
          currentWeeklyMenu = existingMenu
          setWeeklyMenu(currentWeeklyMenu)
        } else {
          // Crear nuevo menú
          const { data: newMenu, error: createError } = await supabase
            .from("weekly_menus")
            .insert({
              name: `Menú del ${formatDateToDDMMYYYY(currentStartDate)} al ${formatDateToDDMMYYYY(endDateStr)}`,
              start_date: currentStartDate,
              end_date: endDateStr,
              user_id: user?.id,
              is_saved: true, // Se marca como guardado al generar
              saved_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (createError) {
            throw createError
          }
          currentWeeklyMenu = newMenu
          setWeeklyMenu(currentWeeklyMenu)
        }
      }

      // Eliminar los platos existentes
      await supabase.from("menu_items").delete().eq("weekly_menu_id", currentWeeklyMenu.id)

      // Crear nuevos platos aleatorios
      if (recipes.length > 0) {
        const menuItemsToInsert = []

        for (let day = 0; day < 7; day++) {
          // Comida - 2 platos
          for (let dishOrder = 1; dishOrder <= 2; dishOrder++) {
            const lunchIndex = Math.floor(Math.random() * recipes.length)
            menuItemsToInsert.push({
              weekly_menu_id: currentWeeklyMenu.id,
              recipe_id: recipes[lunchIndex].id,
              day_of_week: day,
              meal_type: "comida",
              dish_order: dishOrder,
            })
          }

          // Cena - 1 plato
          const dinnerIndex = Math.floor(Math.random() * recipes.length)
          menuItemsToInsert.push({
            weekly_menu_id: currentWeeklyMenu.id,
            recipe_id: recipes[dinnerIndex].id,
            day_of_week: day,
            meal_type: "cena",
            dish_order: 1,
          })
        }

        await supabase.from("menu_items").insert(menuItemsToInsert)
      }

      toast({
        title: "Menú generado",
        description: "Se ha generado un nuevo menú semanal.",
      })

      // Recargar datos
      if (onDataUpdate) {
        onDataUpdate()
      }
    } catch (error) {
      console.error("Error generating menu:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al generar el menú.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Función MEJORADA para manejar la creación de una nueva receta desde la IA
  const handleRecipeCreated = async (
    newRecipe: Recipe,
    dayOfWeek: number,
    mealType: "comida" | "cena",
    dishOrder = 1,
  ) => {
    console.log("🆕 Nueva receta creada desde IA:", newRecipe.name, "ID:", newRecipe.id)

    try {
      // 1. Añadir la nueva receta a la lista local INMEDIATAMENTE
      setRecipes((prevRecipes) => {
        const recipeExists = prevRecipes.some((r) => r.id === newRecipe.id)
        if (recipeExists) {
          console.log("⚠️ La receta ya existe en la lista")
          return prevRecipes
        }

        const updatedRecipes = [...prevRecipes, newRecipe]
        console.log("📝 Lista de recetas actualizada, total:", updatedRecipes.length)
        return updatedRecipes
      })

      // 2. Crear/actualizar el menú semanal si es necesario
      const supabase = getSupabaseClient()
      let currentWeeklyMenu = weeklyMenu

      if (!currentWeeklyMenu) {
        const endDateStr = new Date(new Date(currentStartDate).getTime() + 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]

        const { data: existingMenu } = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("start_date", currentStartDate)
          .eq("end_date", endDateStr)
          .eq("user_id", user?.id)
          .maybeSingle()

        if (existingMenu) {
          currentWeeklyMenu = existingMenu
          setWeeklyMenu(currentWeeklyMenu)
        } else {
          const { data: newMenu, error: createError } = await supabase
            .from("weekly_menus")
            .insert({
              name: `Menú del ${formatDateToDDMMYYYY(currentStartDate)} al ${formatDateToDDMMYYYY(endDateStr)}`,
              start_date: currentStartDate,
              end_date: endDateStr,
              user_id: user?.id,
              is_saved: false,
            })
            .select()
            .single()

          if (createError) throw createError
          currentWeeklyMenu = newMenu
          setWeeklyMenu(currentWeeklyMenu)
        }
      }

      // 3. Añadir/actualizar el item del menú directamente en la base de datos
      const finalDishOrder = dishOrder || 1

      if (mealType === "comida") {
        const { data: existingItem } = await supabase
          .from("menu_items")
          .select("*")
          .eq("weekly_menu_id", currentWeeklyMenu.id)
          .eq("day_of_week", dayOfWeek)
          .eq("meal_type", "comida")
          .eq("dish_order", finalDishOrder)
          .maybeSingle()

        if (existingItem) {
          // Actualizar item existente
          await supabase.from("menu_items").update({ recipe_id: newRecipe.id }).eq("id", existingItem.id)

          // Actualizar estado local
          setMenuItems((prevItems) =>
            prevItems.map((item) =>
              item.id === existingItem.id ? { ...item, recipe_id: newRecipe.id, recipe: newRecipe } : item,
            ),
          )
        } else {
          // Crear nuevo item
          const { data: newItem, error: insertError } = await supabase
            .from("menu_items")
            .insert({
              weekly_menu_id: currentWeeklyMenu.id,
              recipe_id: newRecipe.id,
              day_of_week: dayOfWeek,
              meal_type: "comida",
              dish_order: finalDishOrder,
            })
            .select()
            .single()

          if (insertError) throw insertError

          if (newItem) {
            const newMenuItemWithRecipe = {
              ...newItem,
              recipe: newRecipe,
            } as MenuItem
            setMenuItems((prevItems) => [...prevItems, newMenuItemWithRecipe])
          }
        }
      } else {
        // Para cena
        const { data: existingItem } = await supabase
          .from("menu_items")
          .select("*")
          .eq("weekly_menu_id", currentWeeklyMenu.id)
          .eq("day_of_week", dayOfWeek)
          .eq("meal_type", "cena")
          .maybeSingle()

        if (existingItem) {
          await supabase.from("menu_items").update({ recipe_id: newRecipe.id }).eq("id", existingItem.id)

          setMenuItems((prevItems) =>
            prevItems.map((item) =>
              item.id === existingItem.id ? { ...item, recipe_id: newRecipe.id, recipe: newRecipe } : item,
            ),
          )
        } else {
          const { data: newItem, error: insertError } = await supabase
            .from("menu_items")
            .insert({
              weekly_menu_id: currentWeeklyMenu.id,
              recipe_id: newRecipe.id,
              day_of_week: dayOfWeek,
              meal_type: "cena",
              dish_order: 1,
            })
            .select()
            .single()

          if (insertError) throw insertError

          if (newItem) {
            const newMenuItemWithRecipe = {
              ...newItem,
              recipe: newRecipe,
            } as MenuItem
            setMenuItems((prevItems) => [...prevItems, newMenuItemWithRecipe])
          }
        }
      }

      // 4. Marcar el menú como guardado si no lo estaba
      if (currentWeeklyMenu && !currentWeeklyMenu.is_saved) {
        await supabase
          .from("weekly_menus")
          .update({
            is_saved: true,
            saved_at: new Date().toISOString(),
          })
          .eq("id", currentWeeklyMenu.id)

        setWeeklyMenu({ ...currentWeeklyMenu, is_saved: true, saved_at: new Date().toISOString() })
      }

      console.log("✅ Receta creada y seleccionada automáticamente")

      toast({
        title: "¡Receta añadida al menú!",
        description: `"${newRecipe.name}" se ha creado y seleccionado automáticamente.`,
      })
    } catch (error) {
      console.error("❌ Error al crear y seleccionar la receta:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al añadir la receta al menú.",
        variant: "destructive",
      })
    }
    setForceUpdate((prev) => prev + 1)
  }

  const handleRemoveRecipe = async (dayOfWeek: number, mealType: "comida" | "cena", dishOrder?: number) => {
    if (!weeklyMenu) return

    setIsUpdating(true)

    try {
      const supabase = getSupabaseClient()
      const finalDishOrder = dishOrder || 1

      // Eliminar el plato específico
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("weekly_menu_id", weeklyMenu.id)
        .eq("day_of_week", dayOfWeek)
        .eq("meal_type", mealType)
        .eq("dish_order", finalDishOrder)

      if (error) throw error

      // Actualizar el estado local eliminando el item
      const updatedMenuItems = menuItems.filter(
        (item) =>
          !(
            item.weekly_menu_id === weeklyMenu.id &&
            item.day_of_week === dayOfWeek &&
            item.meal_type === mealType &&
            item.dish_order === finalDishOrder
          ),
      )
      setMenuItems(updatedMenuItems)

      toast({
        title: "Receta eliminada",
        description: "La receta se ha eliminado del menú.",
      })
    } catch (error) {
      console.error("Error removing recipe:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar la receta.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Calcular la fecha de fin para mostrar en el título
  const endDateStr = new Date(new Date(currentStartDate).getTime() + 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {isCurrentWeek
            ? "Menú Semana Actual"
            : isNextWeek
              ? "Menú Semana Siguiente"
              : `Menú del ${formatDateToDDMMYYYY(currentStartDate)} al ${formatDateToDDMMYYYY(endDateStr)}`}
          {weeklyMenu?.is_saved && (
            <Badge variant="secondary" className="text-xs">
              Guardado
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={menuHistory.length === 0}>
                Historial de Menús
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {menuHistory.length === 0 ? (
                <DropdownMenuItem disabled>No hay menús guardados</DropdownMenuItem>
              ) : (
                menuHistory.map((menu) => (
                  <DropdownMenuItem
                    key={menu.id}
                    onClick={() => onMenuSelect?.(menu)}
                    className="flex flex-col items-start gap-1 p-3"
                  >
                    <div className="font-medium">{getFormattedMenuName(menu)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateToDDMMYYYY(menu.start_date)} al {formatDateToDDMMYYYY(menu.end_date)}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isCurrentWeek && (
            <Button variant="outline" onClick={() => handleWeekChangeLocal("next")}>
              La semana que viene
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {isNextWeek && (
            <Button variant="outline" onClick={() => handleWeekChangeLocal("current")}>
              Semana actual
            </Button>
          )}

          <Button onClick={handleGenerateMenu} disabled={isGenerating || recipes.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {weeklyMenu ? "Regenerar Menú" : "Generar Menú"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mostrar las fechas debajo de la cabecera */}
      <div className="text-sm text-muted-foreground">
        {formatDateToDDMMYYYY(currentStartDate)} al {formatDateToDDMMYYYY(endDateStr)}
        <span className="ml-4 text-xs">📊 Total recetas disponibles: {recipes.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {daysMenu.map((dayMenu) => (
          <Card key={dayMenu.day}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{dayMenu.dayName}</span>
                <span className="text-sm font-normal text-muted-foreground">{formatDateToDDMMYYYY(dayMenu.date)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comida - 2 platos */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  Comida
                  <Badge variant="outline" className="text-xs">
                    2 platos
                  </Badge>
                </h3>

                {/* Primer plato */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">1er plato</Label>
                  <div className="flex flex-col gap-2">
                    <Select
                      key={`comida-1-${dayMenu.day}-${recipes.length}-${forceUpdate}`} // Key que cambia cuando se añaden recetas
                      value={dayMenu.meals.comida[0]?.id.toString() || ""}
                      onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 1)}
                      disabled={isUpdating || recipes.length === 0}
                    >
                      <SelectTrigger
                        className={
                          dayMenu.meals.comida[0] ? "font-semibold text-blue-700 border-blue-300 bg-blue-50" : ""
                        }
                      >
                        <SelectValue placeholder="Seleccionar receta" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id.toString()}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      {dayMenu.meals.comida[0] && (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/recipes/${dayMenu.meals.comida[0].id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver receta
                          </Link>
                        </Button>
                      )}

                      {dayMenu.meals.comida[0] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRecipe(dayMenu.day, "comida", 1)}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <AiRecipeSuggestion
                        onRecipeCreated={(newRecipe) => handleRecipeCreated(newRecipe, dayMenu.day, "comida", 1)}
                        mealType="comida"
                        dishOrder={1}
                        dayName={dayMenu.dayName}
                      />
                    </div>
                  </div>
                </div>

                {/* Segundo plato */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">2do plato</Label>
                  <div className="flex flex-col gap-2">
                    <Select
                      key={`comida-2-${dayMenu.day}-${recipes.length}-${forceUpdate}`} // Key que cambia cuando se añaden recetas
                      value={dayMenu.meals.comida[1]?.id.toString() || ""}
                      onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 2)}
                      disabled={isUpdating || recipes.length === 0}
                    >
                      <SelectTrigger
                        className={
                          dayMenu.meals.comida[1] ? "font-semibold text-orange-700 border-orange-300 bg-orange-50" : ""
                        }
                      >
                        <SelectValue placeholder="Seleccionar receta" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id.toString()}>
                              {recipe.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      {dayMenu.meals.comida[1] && (
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link href={`/recipes/${dayMenu.meals.comida[1].id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver receta
                          </Link>
                        </Button>
                      )}

                      {dayMenu.meals.comida[1] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRecipe(dayMenu.day, "comida", 2)}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      <AiRecipeSuggestion
                        onRecipeCreated={(newRecipe) => handleRecipeCreated(newRecipe, dayMenu.day, "comida", 2)}
                        mealType="comida"
                        dishOrder={2}
                        dayName={dayMenu.dayName}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cena - 1 plato */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Cena</h3>
                <div className="flex flex-col gap-2">
                  <Select
                    key={`cena-${dayMenu.day}-${recipes.length}-${forceUpdate}`} // Key que cambia cuando se añaden recetas
                    value={dayMenu.meals.cena?.id.toString() || ""}
                    onValueChange={(value) => handleRecipeChange(dayMenu.day, "cena", value)}
                    disabled={isUpdating || recipes.length === 0}
                  >
                    <SelectTrigger
                      className={
                        dayMenu.meals.cena ? "font-semibold text-purple-700 border-purple-300 bg-purple-50" : ""
                      }
                    >
                      <SelectValue placeholder="Seleccionar receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id.toString()}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    {dayMenu.meals.cena && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/recipes/${dayMenu.meals.cena.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver receta
                        </Link>
                      </Button>
                    )}
                    {dayMenu.meals.cena && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRecipe(dayMenu.day, "cena")}
                        disabled={isUpdating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <AiRecipeSuggestion
                      onRecipeCreated={(newRecipe) => handleRecipeCreated(newRecipe, dayMenu.day, "cena")}
                      mealType="cena"
                      dishOrder={1}
                      dayName={dayMenu.dayName}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-6 bg-muted rounded-lg">
          <p className="text-muted-foreground">
            No hay recetas disponibles. Añade algunas recetas antes de crear un menú semanal.
          </p>
          <Button asChild className="mt-4">
            <Link href="/recipes/add">Añadir Receta</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
