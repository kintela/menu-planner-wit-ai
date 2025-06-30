"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import type { Recipe, MenuItem, WeeklyMenu } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface WeeklyMenuViewProps {
  userId: string
}

interface MenuItemWithRecipe extends MenuItem {
  recipe: Recipe
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  {
    key: "lunch",
    label: "Comida",
    dishes: [
      { order: 0, label: "Primer plato" },
      { order: 1, label: "Segundo plato" },
    ],
  },
  { key: "dinner", label: "Cena", dishes: [{ order: 0, label: "Plato único" }] },
] as const

export function WeeklyMenuView({ userId }: WeeklyMenuViewProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemWithRecipe[]>([])
  const [startDate, setStartDate] = useState<string>("")
  const [hasConnectionIssues, setHasConnectionIssues] = useState(false)
  const { toast } = useToast()

  const getCurrentWeekStartDate = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(today.getDate() - daysToSubtract)
    return startOfWeek.toISOString().split("T")[0]
  }

  const formatDateRange = (startDate: string) => {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    return `${start.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })} - ${end.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })}`
  }

  // Función para mapear entre valores del componente y valores de la BD
  const mapMealTypeToDb = (mealType: "lunch" | "dinner"): string => {
    return mealType === "lunch" ? "comida" : "cena"
  }

  // Función para mapear desde valores de la BD a valores del componente
  const mapMealTypeFromDb = (dbMealType: string): "lunch" | "dinner" => {
    return dbMealType === "comida" ? "lunch" : "dinner"
  }

  const loadDataForWeek = async (weekStartDate: string) => {
    console.log("🔄 Iniciando carga de datos para la semana:", weekStartDate)

    // Establecer estados por defecto INMEDIATAMENTE
    setWeeklyMenu(null)
    setMenuItems([])
    setHasConnectionIssues(false)
    setLoading(true)

    // Timeout para garantizar que el loading termine
    const loadingTimeout = setTimeout(() => {
      console.log("⏰ Timeout de carga alcanzado, terminando loading")
      setLoading(false)
    }, 3000)

    try {
      const endOfWeek = new Date(weekStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endDate = endOfWeek.toISOString().split("T")[0]

      // 1. CARGAR RECETAS (crítico para el funcionamiento)
      console.log("📚 Cargando recetas...")
      try {
        const recipesResponse = await supabase.from("recipes").select("*").order("name")

        if (recipesResponse.error) {
          console.warn("⚠️ Error al cargar recetas:", recipesResponse.error.message)
          setHasConnectionIssues(true)
          setRecipes([]) // Array vacío, no undefined
        } else {
          const recipesData = recipesResponse.data || []
          setRecipes(recipesData)
          console.log(`✅ ${recipesData.length} recetas cargadas correctamente`)
        }
      } catch (recipesError) {
        console.warn("⚠️ Excepción al cargar recetas:", recipesError)
        setHasConnectionIssues(true)
        setRecipes([])
      }

      // 2. BUSCAR MENÚ SEMANAL (opcional - no es error si no existe)
      console.log("📅 Buscando menú semanal existente...")
      try {
        const menuResponse = await supabase
          .from("weekly_menus")
          .select("*")
          .eq("start_date", weekStartDate)
          .eq("end_date", endDate)
          .eq("user_id", userId)
          .maybeSingle()

        if (menuResponse.error) {
          console.warn("⚠️ Error al buscar menú semanal:", menuResponse.error.message)
          setHasConnectionIssues(true)
          setWeeklyMenu(null)
        } else if (menuResponse.data) {
          setWeeklyMenu(menuResponse.data)
          console.log("✅ Menú semanal encontrado:", menuResponse.data.name)

          // 3. CARGAR ITEMS DEL MENÚ (solo si hay menú)
          console.log("🍽️ Cargando items del menú...")
          try {
            const itemsResponse = await supabase
              .from("menu_items")
              .select(`
                *,
                recipe:recipe_id (*)
              `)
              .eq("weekly_menu_id", menuResponse.data.id)
              .order("day_of_week")
              .order("meal_type")
              .order("dish_order")

            if (itemsResponse.error) {
              console.warn("⚠️ Error al cargar items del menú:", itemsResponse.error.message)
              setHasConnectionIssues(true)
              setMenuItems([])
            } else {
              const itemsData = (itemsResponse.data as unknown as MenuItemWithRecipe[]) || []
              setMenuItems(itemsData)
              console.log(`✅ ${itemsData.length} items del menú cargados`)
              console.log(
                "📋 Items cargados:",
                itemsData.map((item) => ({
                  day: item.day_of_week,
                  meal: item.meal_type,
                  dish: item.dish_order,
                  recipe: item.recipe?.name,
                })),
              )
            }
          } catch (itemsError) {
            console.warn("⚠️ Excepción al cargar items del menú:", itemsError)
            setHasConnectionIssues(true)
            setMenuItems([])
          }
        } else {
          setWeeklyMenu(null)
          setMenuItems([])
          console.log("📝 No hay menú para esta semana - esto es normal para semanas nuevas")
        }
      } catch (menuError) {
        console.warn("⚠️ Excepción al buscar menú semanal:", menuError)
        setHasConnectionIssues(true)
        setWeeklyMenu(null)
        setMenuItems([])
      }

      console.log("✅ Carga de datos completada")
    } catch (generalError) {
      console.warn("⚠️ Error general en la carga:", generalError)
      setHasConnectionIssues(true)
    } finally {
      // SIEMPRE terminar el loading
      clearTimeout(loadingTimeout)
      setLoading(false)
      console.log("🏁 Loading terminado")
    }
  }

  useEffect(() => {
    if (userId) {
      const currentWeekStart = getCurrentWeekStartDate()
      setStartDate(currentWeekStart)
      loadDataForWeek(currentWeekStart)
    } else {
      setLoading(false)
    }
  }, [userId])

  const changeWeek = (direction: "prev" | "next") => {
    const currentStart = new Date(startDate)
    const newStart = new Date(currentStart)

    if (direction === "prev") {
      newStart.setDate(currentStart.getDate() - 7)
    } else {
      newStart.setDate(currentStart.getDate() + 7)
    }

    const newStartDate = newStart.toISOString().split("T")[0]
    setStartDate(newStartDate)
    loadDataForWeek(newStartDate)
  }

  const getMenuItemsForDayAndMeal = (dayIndex: number, mealType: "lunch" | "dinner", dishOrder: number) => {
    // Mapear el mealType del componente al valor de la BD para hacer la comparación
    const dbMealType = mapMealTypeToDb(mealType)

    const items = menuItems.filter(
      (item) => item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder,
    )

    console.log(
      `🔍 Buscando items para día ${dayIndex}, meal ${mealType} (${dbMealType}), dish ${dishOrder}:`,
      items.length,
    )

    return items
  }

  const createWeeklyMenuIfNeeded = async () => {
    if (weeklyMenu) return weeklyMenu.id

    const endOfWeek = new Date(startDate)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    const endDate = endOfWeek.toISOString().split("T")[0]

    const formatDateToDDMMYYYY = (dateString: string): string => {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES")
    }

    const { data: newMenu, error: createError } = await supabase
      .from("weekly_menus")
      .insert({
        name: `Menú del ${formatDateToDDMMYYYY(startDate)} al ${formatDateToDDMMYYYY(endDate)}`,
        start_date: startDate,
        end_date: endDate,
        user_id: userId,
        is_saved: false,
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating menu:", createError)
      throw createError
    }

    setWeeklyMenu(newMenu)
    console.log("✅ Nuevo menú creado:", newMenu.name)
    return newMenu.id
  }

  const addRecipeToMenu = async (
    dayIndex: number,
    mealType: "lunch" | "dinner",
    dishOrder: number,
    recipeId: string,
  ) => {
    try {
      console.log("🍽️ Añadiendo receta al menú:", { dayIndex, mealType, dishOrder, recipeId })

      // Verificar si ya existe una receta en esta posición
      const existingItems = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)
      if (existingItems.length > 0) {
        // Eliminar la receta existente primero
        await removeRecipeFromMenu(existingItems[0].id)
      }

      // Crear menú si no existe
      const menuId = await createWeeklyMenuIfNeeded()

      // Mapear meal_type a los valores correctos de la base de datos (español)
      const dbMealType = mapMealTypeToDb(mealType)

      console.log("📝 Insertando menu item con valores en español:", {
        weekly_menu_id: menuId,
        recipe_id: recipeId,
        day_of_week: dayIndex,
        meal_type: dbMealType,
        dish_order: dishOrder,
      })

      const { data: newItem, error } = await supabase
        .from("menu_items")
        .insert({
          weekly_menu_id: menuId,
          recipe_id: recipeId,
          day_of_week: dayIndex,
          meal_type: dbMealType,
          dish_order: dishOrder,
        })
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .single()

      if (error) {
        console.error("❌ Error adding recipe to menu:", error)
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      setMenuItems((prev) => [
        ...prev.filter(
          (item) => !(item.day_of_week === dayIndex && item.meal_type === dbMealType && item.dish_order === dishOrder),
        ),
        newItem as unknown as MenuItemWithRecipe,
      ])

      console.log("✅ Receta añadida correctamente al menú")
      toast({
        title: "Receta añadida",
        description: "La receta se ha añadido al menú correctamente",
      })
    } catch (error) {
      console.error("❌ Error adding recipe:", error)
      toast({
        title: "Error",
        description: `No se pudo añadir la receta al menú: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    }
  }

  const removeRecipeFromMenu = async (menuItemId: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", menuItemId)

      if (error) {
        console.error("Error removing recipe from menu:", error)
        throw error
      }

      setMenuItems((prev) => prev.filter((item) => item.id !== menuItemId))

      toast({
        title: "Receta eliminada",
        description: "La receta se ha eliminado del menú correctamente",
      })
    } catch (error) {
      console.error("Error removing recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la receta del menú",
        variant: "destructive",
      })
    }
  }

  // Mostrar loading solo por máximo 3 segundos
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4 mx-auto"></div>
          <div className="grid gap-4 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">Cargando planificador de menús...</div>
      </div>
    )
  }

  // SIEMPRE renderizar la interfaz después del loading
  const menuTitle = weeklyMenu?.name || `Nuevo Menú - ${formatDateRange(startDate)}`

  return (
    <div className="space-y-6 p-6">
      {/* Mostrar advertencia si hay problemas de conexión */}
      {hasConnectionIssues && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600 text-sm">
              ⚠️ Algunos datos no se pudieron cargar correctamente. Puedes seguir usando el planificador, pero algunas
              funciones pueden estar limitadas.
            </div>
          </div>
        </div>
      )}

      {/* Header con navegación de semanas */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => changeWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{menuTitle}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
              <Calendar className="h-4 w-4" />
              {formatDateRange(startDate)}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={() => changeWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de días */}
      <div className="grid gap-4 md:grid-cols-7">
        {DAYS.map((day, dayIndex) => (
          <Card key={day} className="min-h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {MEAL_TYPES.map(({ key: mealType, label, dishes }) => (
                <div key={mealType} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${mealType === "lunch" ? "text-orange-600" : "text-blue-600"}`}>
                      {label}
                    </h4>
                  </div>

                  {/* Platos */}
                  <div className="space-y-2">
                    {dishes.map(({ order: dishOrder, label: dishLabel }) => {
                      const existingItem = getMenuItemsForDayAndMeal(dayIndex, mealType, dishOrder)[0]

                      return (
                        <div key={dishOrder} className="space-y-1">
                          <div className="text-xs text-muted-foreground">{dishLabel}</div>

                          <Select
                            value={existingItem?.recipe_id || "default"}
                            onValueChange={(recipeId) => {
                              if (recipeId === "default") {
                                if (existingItem) {
                                  removeRecipeFromMenu(existingItem.id)
                                }
                              } else {
                                addRecipeToMenu(dayIndex, mealType, dishOrder, recipeId)
                              }
                            }}
                            disabled={recipes.length === 0}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={recipes.length === 0 ? "No hay recetas" : "Añadir receta"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Añadir receta</SelectItem>
                              {recipes.map((recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id}>
                                  {recipe.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de recetas */}
      {recipes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Recetas Disponibles ({recipes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <h4 className="font-medium text-sm truncate">{recipe.name}</h4>
                  {recipe.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
                  )}
                  {recipe.category && (
                    <span className="inline-block mt-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      {recipe.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay recetas */}
      {recipes.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No hay recetas disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Necesitas crear algunas recetas antes de poder planificar tu menú semanal.
            </p>
            <Button onClick={() => (window.location.href = "/recipes/add")}>Crear primera receta</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WeeklyMenuView
