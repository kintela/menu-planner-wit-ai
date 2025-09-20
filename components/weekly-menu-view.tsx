"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChefHat, Flame, Users, Trash2, Plus, User } from "lucide-react"
import { RefreshCcw } from "lucide-react"
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
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [isGenerating, setIsGenerating] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

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
      
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear()
        return `${day}/${month}/${year}`
      }

      const weekText = `${formatDate(startOfWeek)} al ${formatDate(endOfWeek)}`

      setWeekDates({ startDateStr, endDateStr, weekText })

      await loadExistingMenu(startDateStr, endDateStr)
    }

    if (userId) {
      initializeWeekAndLoadMenu()
    }
  }, [userId])

  const loadExistingMenu = async (startDateStr: string, endDateStr: string) => {
    try {
      if (!userId) {
        setIsLoading(false)
        return
      }

      const { data: existingMenu, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", userId)
        .eq("start_date", startDateStr)
        .maybeSingle()

      if (menuError && menuError.code !== "PGRST116") {
        console.error("Error buscando menú existente:", menuError)
        setIsLoading(false)
        return
      }

      if (existingMenu) {
        setExistingMenuId(existingMenu.id)

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

  const addRecipeToMenu = (day: string, mealTypeKey: string, recipeId: number, recipeObj?: Recipe) => {
    const recipe = recipeObj || recipes.find(r => r.id === recipeId)
    if (!recipe) return

    const [meal_type, orderStr] = mealTypeKey.split('-')
    const dish_order = parseInt(orderStr)
    
    const newEntry: MenuEntry = {
      id: Date.now(), // ID temporal
      day,
      meal_type,
      dish_order,
      recipe_id: recipeId,
      recipe
    }
    
    setMenuEntries(prev => {
      // Si ya existe una entrada en ese hueco, la reemplazamos (permitiendo regenerar manualmente un plato)
      const filtered = prev.filter(e => !(e.day === day && e.meal_type === meal_type && e.dish_order === dish_order))
      return [...filtered, newEntry]
    })
    setShowRecipeSelector(null)
  }

  const removeRecipeFromMenu = (entryId: number) => {
    setMenuEntries(prev => prev.filter(entry => entry.id !== entryId))
  }

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

      const menuItemsToInsert = menuEntries
        .filter(entry => entry.recipe_id)
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

      toast({
        title: "¡Menú guardado!",
        description: `Tu menú semanal del ${weekDates.weekText} se ha guardado correctamente.`,
      })

      await loadExistingMenu(weekDates.startDateStr, weekDates.endDateStr)
      
    } catch (error) {
      console.error("Error guardando menú:", error)
      
      toast({
        title: "Error al guardar el menú",
        description: "No se pudo guardar el menú semanal. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getMenuEntry = (day: string, mealType: string, dishOrder: number) => {
    return menuEntries.find(entry => 
      entry.day === day && 
      entry.meal_type === mealType && 
      entry.dish_order === dishOrder
    );
  };

  useEffect(() => {
    setRecipes(initialRecipes)
  }, [initialRecipes])

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

  async function fetchRecipeWithProfile(recipeId: number): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select(`
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
        `)
        .eq("id", recipeId)
        .single()
      if (error) {
        console.error("Error fetching recipe with profile:", error)
        return null
      }
      return data as Recipe
    } catch (err) {
      console.error("Error fetching recipe with profile:", err)
      return null
    }
  }

  function classifyRecipe(r: Recipe) {
    const name = (r.name || "").toLowerCase()
    const calories = r.calories || 0
    const keywordsLight = ["sopa", "crema", "ensalada", "ensaladilla", "gazpacho", "verdura", "brocoli", "brócoli", "vegetal", "hummus", "puré", "pure", "salteado", "salteada", "caldo"]
    const keywordsHeavy = ["paella", "lasaña", "lasana", "cordero", "asado", "guiso", "estofado", "frito", "cocido", "fabada", "chuleta", "costilla", "hamburguesa", "pizza"]
    const dessertKeywords = ["tarta", "pastel", "bizcocho", "brownie", "galleta", "muffin", "cupcake", "flan", "natilla", "helado", "compota", "postre", "pudin", "pudding", "mermelada", "crepe", "crêpe", "gofre", "waffle", "mouse", "mousse", "panacota", "panna cotta", "tiramisú", "tiramisu"]
    const processedKeywords = ["frito", "empanado", "rebozado", "burger", "hamburguesa", "pizza", "industrial"]

    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      pollo: ["pollo", "chicken"],
      pavo: ["pavo", "turkey"],
      ternera: ["ternera", "vacuno", "beef", "carne de res"],
      cerdo: ["cerdo", "panceta", "lomo", "jamon", "jamón"],
      pescado: ["pescado", "fish", "merluza", "bacalao", "dorada", "lubina", "rape", "salmón", "salmon", "atún", "atun", "bonito", "sardina", "caballa", "trucha"],
      marisco: ["gamba", "gambas", "langostino", "pulpo", "calamar", "sepia", "mejillon", "mejillón", "almeja"],
      legumbre: ["lenteja", "lentejas", "garbanzo", "garbanzos", "alubia", "alubias", "frijol", "judía", "judias", "soja"],
      huevo: ["huevo", "huevos", "tortilla", "revuelto"],
      pasta: ["pasta", "espagueti", "spaghetti", "macarron", "macarrón", "macarrones", "lasaña", "lasana"],
      arroz: ["arroz", "risotto", "paella"],
      patata: ["patata", "patatas", "papas"],
      vegetal: ["ensalada", "verdura", "verduras", "brocoli", "brócoli", "calabacin", "calabacín", "coliflor", "zanahoria", "espinaca", "espinacas", "acelga", "acelgas", "alcachofa", "alcachofas"],
      sopa: ["sopa", "caldo", "crema", "gazpacho", "puré", "pure"],
      huevo_veg: ["huevo", "huevos", "tofu", "tempeh", "seitan", "seitán"],
    }

    const isDessert = dessertKeywords.some(k => name.includes(k))

    let primaryCategory = "otros"
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      if (kws.some(k => name.includes(k))) { primaryCategory = cat; break }
    }
    if (isDessert) primaryCategory = "postre"

    // Determinar "peso" del plato
    let weight = 2 // 1 ligero, 2 medio, 3 contundente
    if (keywordsLight.some(k => name.includes(k))) weight = 1
    if (keywordsHeavy.some(k => name.includes(k))) weight = 3
    // Ajuste por calorías si están disponibles
    if (calories > 0) {
      if (calories < 250) weight = 1
      else if (calories > 650) weight = 3
    }

    // Puntuación de salud base
    let healthScore = 50
    if (["vegetal", "sopa"].includes(primaryCategory)) healthScore += 25
    if (["legumbre", "pescado", "marisco"].includes(primaryCategory)) healthScore += 20
    if (["pollo", "pavo"].includes(primaryCategory)) healthScore += 10
    if (processedKeywords.some(k => name.includes(k))) healthScore -= 25
    if (keywordsHeavy.some(k => name.includes(k))) healthScore -= 10
    if (weight === 1) healthScore += 5
    if (weight === 3) healthScore -= 10
    if (isDessert) healthScore -= 40
    // Ajuste adicional por calorías extremas
    if (calories > 800) healthScore -= 15
    if (calories > 1000) healthScore -= 25
    if (calories > 0 && calories < 180) healthScore += 5

    const label = isDessert ? "postre" : weight === 1 ? "ligero" : weight === 2 ? "medio" : "contundente"
    return { weight, label, isDessert, primaryCategory, healthScore }
  }

  function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

  function computeUsageCounts(excludeDay?: string) {
    const counts: Record<string, number> = {}
    const daysSeenForCategory: Record<string, Set<string>> = {}
    menuEntries.forEach(e => {
      if (excludeDay && e.day === excludeDay) return
      if (!e.recipe) return
      const cls = classifyRecipe(e.recipe)
      const cat = cls.primaryCategory
      if (!daysSeenForCategory[cat]) daysSeenForCategory[cat] = new Set()
      daysSeenForCategory[cat].add(e.day)
    })
    for (const [cat, setDays] of Object.entries(daysSeenForCategory)) {
      counts[cat] = setDays.size
    }
    return counts
  }

  function canUseCategory(cat: string, usageCounts: Record<string, number>) {
    if (cat === 'postre') return false
    return (usageCounts[cat] || 0) < 2
  }

  function generateHealthyDayMenu(day: string, globalUsageCounts: Record<string, number>, heavyUsed: {count: number}, enrichedAll: { r: Recipe; cls: ReturnType<typeof classifyRecipe> }[]) {
    const results: MenuEntry[] = []

    const savoryEnriched = enrichedAll.filter(e => !e.cls.isDessert)
    const lightOrMedium = savoryEnriched.filter(e => e.cls.weight <= 2)

    function pickCandidate(pool: typeof enrichedAll, opts: {avoidCategories?: string[], minWeight?: number, maxWeight?: number, allowHeavy?: boolean} = {}) {
      let filtered = pool.filter(e => canUseCategory(e.cls.primaryCategory, globalUsageCounts))
      if (opts.minWeight) filtered = filtered.filter(e => e.cls.weight >= opts.minWeight!)
      if (opts.maxWeight) filtered = filtered.filter(e => e.cls.weight <= opts.maxWeight!)
      if (opts.allowHeavy === false) filtered = filtered.filter(e => e.cls.weight < 3)
      if (opts.avoidCategories && opts.avoidCategories.length) filtered = filtered.filter(e => !opts.avoidCategories!.includes(e.cls.primaryCategory))
      if (filtered.length === 0) filtered = pool
      // Orden más saludable primero
      filtered = [...filtered].sort((a,b) => b.cls.healthScore - a.cls.healthScore)
      // Tomar top 30% para algo de variación
      const sliceSize = Math.max(3, Math.ceil(filtered.length * 0.3))
      const top = filtered.slice(0, sliceSize)
      return shuffle(top)[0]
    }

    const first = pickCandidate(lightOrMedium, { maxWeight: 2 })
    if (first) {
      results.push({ id: Date.now() + Math.random(), day, meal_type: 'comida', dish_order: 1, recipe_id: first.r.id, recipe: first.r })
      globalUsageCounts[first.cls.primaryCategory] = (globalUsageCounts[first.cls.primaryCategory] || 0) + 1
    }

    const avoidCat = first ? [classifyRecipe(first.r).primaryCategory] : []
    let second = pickCandidate(savoryEnriched, { minWeight: 2, allowHeavy: heavyUsed.count < 3, avoidCategories: avoidCat })
    if (second && second.cls.weight === 3) heavyUsed.count += 1
    if (second) {
      results.push({ id: Date.now() + Math.random(), day, meal_type: 'comida', dish_order: 2, recipe_id: second.r.id, recipe: second.r })
      globalUsageCounts[second.cls.primaryCategory] = (globalUsageCounts[second.cls.primaryCategory] || 0) + 1
    }

    const dinner = pickCandidate(lightOrMedium, { maxWeight: 2, avoidCategories: [] })
    if (dinner) {
      results.push({ id: Date.now() + Math.random(), day, meal_type: 'cena', dish_order: 1, recipe_id: dinner.r.id, recipe: dinner.r })
      globalUsageCounts[dinner.cls.primaryCategory] = (globalUsageCounts[dinner.cls.primaryCategory] || 0) + 1
    }

    return results
  }

  async function generateRandomMenu() {
    if (!recipes || recipes.length === 0) {
      toast({ title: "Sin recetas", description: "No hay recetas disponibles para generar el menú.", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      const enriched = recipes.map(r => ({ r, cls: classifyRecipe(r) }))
      const usageCounts: Record<string, number> = {}
      const heavyUsed = { count: 0 }
      const newEntries: MenuEntry[] = []
      DAYS.forEach(day => {
        const dayEntries = generateHealthyDayMenu(day, usageCounts, heavyUsed, enriched)
        newEntries.push(...dayEntries)
      })
      setMenuEntries(newEntries)
      const categoriesOverLimit = Object.entries(usageCounts).filter(([_, v]) => v > 2).length
      toast({ title: "Menú generado", description: categoriesOverLimit ? "Se excedieron límites por falta de opciones, revisa." : "Menú saludable creado. Revisa y guarda." })
    } catch (err) {
      console.error("Error generando menú aleatorio:", err)
      toast({ title: "Error", description: "No se pudo generar el menú.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  function regenerateDay(day: string) {
    const otherEntries = menuEntries.filter(e => e.day !== day)
    const usageCounts = computeUsageCounts(day)
    const heavyUsed = { count: otherEntries.filter(e => e.recipe && classifyRecipe(e.recipe).weight === 3).length }
    const enriched = recipes.map(r => ({ r, cls: classifyRecipe(r) }))
    const newDayEntries = generateHealthyDayMenu(day, usageCounts, heavyUsed, enriched)
    setMenuEntries([...otherEntries, ...newDayEntries])
    toast({ title: `Día ${day} regenerado`, description: "Ajustado con criterios saludables." })
  }

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificador Semanal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateRandomMenu}
                disabled={isGenerating || recipes.length === 0}
              >
                {isGenerating ? "Generando..." : "Generar aleatorio"}
              </Button>
              <Button
                onClick={saveWeeklyMenu}
                disabled={menuEntries.length === 0 || isSaving}
                size="sm"
                className="shrink-0"
              >
                {isSaving ? "Guardando..." : "Guardar Menú"}
              </Button>
            </div>
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-center text-sm flex-1">{day}</h3>
                  <button
                    type="button"
                    onClick={() => regenerateDay(day)}
                    className="text-gray-500 hover:text-gray-800 p-1"
                    title="Regenerar solo este día"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>
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
                        <div className="h-full flex flex-col relative">
                          <div className="flex items-start gap-2 flex-1">
                            <div className="flex-shrink-0">
                              {entry.recipe.image_url ? (
                                <img
                                  src={entry.recipe.image_url}
                                  alt={entry.recipe.name}
                                  className="w-10 h-10 object-cover rounded-md"
                                  title={entry.recipe.name}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                                  <ChefHat className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium line-clamp-2 mb-1 leading-tight">{entry.recipe.name}</p>
                              
                              {entry.recipe.calories && (
                                <div className="flex items-center gap-1">
                                  <Flame className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                  <span className="text-xs text-gray-600">{entry.recipe.calories} cal</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {entry.recipe.user_profiles && (
                            <div className="absolute left-2 bottom-2 flex items-center gap-1 text-xs bg-black/60 text-white backdrop-blur-sm rounded px-2 py-1 w-fit z-10">
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
                          <div className="absolute right-2 bottom-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.id && removeRecipeFromMenu(entry.id)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              title="Eliminar receta"
                            >
                              <Trash2 className="h-5 w-5 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span
                          onClick={() => setShowRecipeSelector({ day, mealType: `${mealType.key}-${mealType.order}` })}
                          className="w-full h-full flex flex-col items-center justify-center text-blue-600 hover:text-blue-800 cursor-pointer select-none rounded-lg text-xs font-medium transition-colors"
                          style={{ minHeight: 60 }}
                        >
                          <Plus className="h-4 w-4 mb-1" />
                          Añadir
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <RecipeSelector
            recipes={recipes}
            day={showRecipeSelector.day}
            mealType={showRecipeSelector.mealType}
            onSelect={async (recipeId, recipeObj) => {
              let recipeToUse: Recipe | undefined = recipeObj
              if (recipeObj && !recipeObj.user_profiles) {
                recipeToUse = (await fetchRecipeWithProfile(recipeObj.id)) || recipeObj
              }
              if (recipeToUse) {
                if (!recipes.find(r => r.id === recipeToUse.id)) {
                  setRecipes(prev => [...prev, recipeToUse])
                }
                addRecipeToMenu(showRecipeSelector.day, showRecipeSelector.mealType, recipeToUse.id, recipeToUse)
              } else {
                addRecipeToMenu(showRecipeSelector.day, showRecipeSelector.mealType, recipeId)
              }
              setShowRecipeSelector(null)
            }}
            onCancel={() => setShowRecipeSelector(null)}
          />
        </div>
      )}
    </div>
  )
})
