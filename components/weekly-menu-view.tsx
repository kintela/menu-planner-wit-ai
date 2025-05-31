"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import Link from "next/link"

import { Loader2, RefreshCw, Eye, Trash2 } from "lucide-react"


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
}

export function WeeklyMenuView({
  weeklyMenu: initialWeeklyMenu,
  menuItems: initialMenuItems,
  initialRecipes,
  startDate,
  onDataUpdate,
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

  // Actualizar estados cuando cambien las props
  useEffect(() => {
    setRecipes(initialRecipes)
  }, [initialRecipes])

  useEffect(() => {
    setWeeklyMenu(initialWeeklyMenu)
  }, [initialWeeklyMenu])

  useEffect(() => {
    setMenuItems(initialMenuItems)
  }, [initialMenuItems])

  // Preparar los datos del menú por día
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  const daysMenu: DayMenu[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate)
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
        // Para comida, añadir al array en el orden correcto
        daysMenu[item.day_of_week].meals.comida[item.dish_order - 1] = item.recipe as Recipe
      } else {
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

      // Si no existe un menú semanal, crearlo primero
      let currentWeeklyMenu = weeklyMenu
      if (!currentWeeklyMenu) {
        const endDate = new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        // Buscar menú existente primero
        const { data: existingMenu } = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("start_date", startDate)
          .eq("end_date", endDate)
          .eq("user_id", user?.id)
          .maybeSingle()

        if (existingMenu) {
          currentWeeklyMenu = existingMenu
          setWeeklyMenu(currentWeeklyMenu)
        } else {
          // Crear nuevo menú solo si no existe
          const { data: newMenu, error: createError } = await supabase
            .from("weekly_menus")
            .insert({
              name: `Menú del ${startDate} al ${endDate}`,
              start_date: startDate,
              end_date: endDate,
              user_id: user?.id,
              is_saved: true,
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

      // Para comida, usar dishOrder; para cena, siempre es 1
      const finalDishOrder = mealType === "comida" ? dishOrder || 1 : 1

      // Encontrar la receta seleccionada
      const selectedRecipe = recipes.find((r) => r.id.toString() === recipeId)

      // Buscar si ya existe un plato para este día, tipo de comida y orden
      const { data: existingItem } = await supabase
        .from("menu_items")
        .select("*")
        .eq("weekly_menu_id", currentWeeklyMenu.id)
        .eq("day_of_week", dayOfWeek)
        .eq("meal_type", mealType)
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
        const { data: newItem } = await supabase
          .from("menu_items")
          .insert({
            weekly_menu_id: currentWeeklyMenu.id,
            recipe_id: Number.parseInt(recipeId),
            day_of_week: dayOfWeek,
            meal_type: mealType,
            dish_order: finalDishOrder,
          })
          .select()
          .single()

        if (newItem) {
          // Añadir al estado local inmediatamente
          const newMenuItemWithRecipe = {
            ...newItem,
            recipe: selectedRecipe,
          } as MenuItem
          setMenuItems([...menuItems, newMenuItemWithRecipe])
        }
      }

      // Marcar el menú como guardado si no lo está ya
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
      }

      toast({
        title: "Menú actualizado",
        description: "El menú se ha actualizado correctamente.",
      })

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
        const endDate = new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        const { data: newMenu, error: createError } = await supabase
          .from("weekly_menus")
          .insert({
            name: `Menú del ${startDate} al ${endDate}`,
            start_date: startDate,
            end_date: endDate,
            user_id: user?.id,
            is_saved: true,
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

  // Función para manejar la creación de una nueva receta desde la IA
  const handleRecipeCreated = async (
    newRecipe: Recipe,
    dayOfWeek: number,
    mealType: "comida" | "cena",
    dishOrder = 1,
  ) => {
    // Añadir la nueva receta a la lista primero
    setRecipes((prev) => [...prev, newRecipe])

    // Esperar un momento para que el estado se actualice
    setTimeout(async () => {
      // Seleccionar automáticamente la nueva receta
      await handleRecipeChange(dayOfWeek, mealType, newRecipe.id.toString(), dishOrder)
    }, 100)
  }


  const handleRemoveRecipe = async (dayOfWeek: number, mealType: "comida" | "cena", dishOrder?: number) => {
    if (!weeklyMenu) return

    setIsUpdating(true)

    try {
      const supabase = getSupabaseClient()
      const finalDishOrder = mealType === "comida" ? dishOrder || 1 : 1

      // Buscar y eliminar el plato existente
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


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {weeklyMenu?.name ||
            `Menú del ${startDate} al ${new Date(new Date(startDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}`}
          {weeklyMenu?.is_saved && (
            <Badge variant="secondary" className="text-xs">
              Guardado
            </Badge>
          )}
        </h2>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {daysMenu.map((dayMenu) => (
          <Card key={dayMenu.day}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{dayMenu.dayName}</span>
                <span className="text-sm font-normal text-muted-foreground">{dayMenu.date}</span>
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
                      value={dayMenu.meals.comida[0]?.id.toString() || ""}
                      onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 1)}
                      disabled={isUpdating || recipes.length === 0}
                    >
                      <SelectTrigger
                        className={
                          dayMenu.meals.comida[0] ? "font-semibold text-green-700 border-green-300 bg-green-50" : ""
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
                        useSaveAndSelect={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Segundo plato */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">2do plato</Label>
                  <div className="flex flex-col gap-2">
                    <Select
                      value={dayMenu.meals.comida[1]?.id.toString() || ""}
                      onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 2)}
                      disabled={isUpdating || recipes.length === 0}
                    >
                      <SelectTrigger
                        className={
                          dayMenu.meals.comida[1] ? "font-semibold text-green-700 border-green-300 bg-green-50" : ""
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
                        useSaveAndSelect={true}
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
                    value={dayMenu.meals.cena?.id.toString() || ""}
                    onValueChange={(value) => handleRecipeChange(dayMenu.day, "cena", value)}
                    disabled={isUpdating || recipes.length === 0}
                  >
                    <SelectTrigger
                      className={dayMenu.meals.cena ? "font-semibold text-green-700 border-green-300 bg-green-50" : ""}
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
                      useSaveAndSelect={true}
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
