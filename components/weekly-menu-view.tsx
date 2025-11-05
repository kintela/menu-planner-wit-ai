"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, ChefHat, Flame, Users, Trash2, Plus, User, Eye, Share2, RefreshCcw, Copy, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { RecipeSelector } from "./recipe-selector"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const formatDateLabel = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
  } catch (error) {
    return value
  }
}

const buildMenuLabel = (name?: string | null, start?: string | null, end?: string | null) => {
  if (name && name.trim().length > 0) return name
  const startLabel = formatDateLabel(start)
  const endLabel = formatDateLabel(end)
  if (startLabel && endLabel) return `Menú ${startLabel} - ${endLabel}`
  if (startLabel) return `Menú ${startLabel}`
  return "Menú guardado"
}

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

interface SavedMenuOption {
  id: number
  name?: string | null
  start_date?: string | null
  end_date?: string | null
  label: string
}

interface WeeklyMenuViewProps {
  initialRecipes?: Recipe[]
  userId: string // Necesitamos el userId
  initialWeekStart?: string
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const MEAL_TYPES = [
  { key: "comida", order: 1, label: "Primer plato", color: "border-blue-300 bg-blue-50" },
  { key: "comida", order: 2, label: "Segundo plato", color: "border-green-300 bg-green-50" },
  { key: "cena", order: 1, label: "Cena", color: "border-orange-300 bg-orange-50" },
]

type MenuStrategy = "balanced" | "healthy" | "indulgent"

const STRATEGY_OPTIONS: Array<{ value: MenuStrategy; title: string; description: string }> = [
  {
    value: "balanced",
    title: "Ni pa tí ni pa mi",
    description: "Una mezcla equilibrada de platos ligeros, contundentes y clásicos.",
  },
  {
    value: "healthy",
    title: "Sano sano...",
    description: "Prioriza verduras, legumbres y opciones ligeras con mejor perfil nutricional.",
  },
  {
    value: "indulgent",
    title: "Me da todo igual",
    description: "Menú con platos más calóricos y contundentes para darse un capricho.",
  },
]

const HEAVY_LIMIT: Record<MenuStrategy, number> = {
  balanced: 3,
  healthy: 1,
  indulgent: 7,
}

const CATEGORY_USAGE_LIMIT: Record<MenuStrategy, number> = {
  balanced: 2,
  healthy: 2,
  indulgent: 3,
}

const formatDateToIso = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

const buildStartDateCandidates = (startIso: string) => {
  const candidates = new Set<string>()
  if (startIso) {
    candidates.add(startIso)
    const base = new Date(`${startIso}T00:00:00`)
    if (!Number.isNaN(base.getTime())) {
      const before = new Date(base)
      before.setDate(before.getDate() - 1)
      candidates.add(formatDateToIso(before))

      const after = new Date(base)
      after.setDate(after.getDate() + 1)
      candidates.add(formatDateToIso(after))
    }
  }
  return Array.from(candidates)
}

export const WeeklyMenuView = React.memo(function WeeklyMenuView({
  initialRecipes = [],
  userId,
  initialWeekStart,
}: WeeklyMenuViewProps) {
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
  const [currentWeekStart, setCurrentWeekStart] = useState<string | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savedMenus, setSavedMenus] = useState<SavedMenuOption[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<MenuStrategy>("balanced")
  const [showGenerationDialog, setShowGenerationDialog] = useState(false)
  const [pendingStrategy, setPendingStrategy] = useState<MenuStrategy>("balanced")
  const [isClearingAll, setIsClearingAll] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const mergeRecipesFromEntries = (entries: MenuEntry[]) => {
    const recipesFromEntries = entries
      .map((entry) => entry.recipe)
      .filter((recipe): recipe is Recipe => Boolean(recipe))

    if (recipesFromEntries.length === 0) return

    setRecipes((prev) => {
      const map = new Map(prev.map((recipe) => [recipe.id, recipe]))
      for (const recipe of recipesFromEntries) {
        if (!map.has(recipe.id)) {
          map.set(recipe.id, recipe)
        }
      }
      return Array.from(map.values())
    })
  }

  const mapMenuItemsToEntries = (menuItems: any[]): MenuEntry[] => {
    if (!Array.isArray(menuItems)) return []

    return menuItems.map((entry) => {
      const dayIndexRaw = typeof entry.day_of_week === "number"
        ? entry.day_of_week
        : Number.parseInt(entry.day_of_week, 10)
      const dayIndex = Number.isNaN(dayIndexRaw) ? 0 : dayIndexRaw

      return {
        id: entry.id,
        day: DAYS[dayIndex] ?? DAYS[0],
        meal_type: entry.meal_type,
        dish_order: entry.dish_order,
        recipe_id: entry.recipe_id,
        recipe: entry.recipes
          ? {
              id: (entry.recipes as any).id,
              name: (entry.recipes as any).name,
              calories: (entry.recipes as any).calories,
              image_url: (entry.recipes as any).image_url,
              user_profiles: (entry.recipes as any).user_profiles ?? undefined,
            }
          : undefined,
      }
    })
  }

  const fetchSavedMenus = async (currentWeekStart?: string) => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from("weekly_menus")
        .select("id, name, start_date, end_date, is_saved")
        .eq("user_id", userId)
        .eq("is_saved", true)
        .order("start_date", { ascending: false })
        .limit(25)

      if (error) {
        console.error("Error fetching saved menus:", error)
        return
      }

      const formatted: SavedMenuOption[] = (data ?? [])
        .filter((menu) => !currentWeekStart || menu.start_date !== currentWeekStart)
        .map((menu) => ({
          id: menu.id,
          name: menu.name,
          start_date: menu.start_date,
          end_date: menu.end_date,
          label: buildMenuLabel(menu.name, menu.start_date, menu.end_date),
        }))

      setSavedMenus(formatted)
    } catch (error) {
      console.error("Error fetching saved menus:", error)
    }
  }

  const applySavedMenu = async (menuId: number) => {
    setIsApplyingTemplate(true)
    try {
      const { data: menuItems, error } = await supabase
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
        .eq("weekly_menu_id", menuId)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (error) {
        console.error("Error loading saved menu items:", error)
        toast({
          title: "No se pudo cargar el menú seleccionado",
          description: "Inténtalo de nuevo más tarde.",
          variant: "destructive",
        })
        return
      }

      const formattedEntries = mapMenuItemsToEntries(menuItems || [])
      mergeRecipesFromEntries(formattedEntries)
      setMenuEntries(formattedEntries)

      toast({
        title: "Menú cargado",
        description: "El menú guardado se ha aplicado a la semana actual. No olvides guardar los cambios.",
      })
    } finally {
      setIsApplyingTemplate(false)
    }
  }

  const handleSavedMenuSelection = async (value: string) => {
    if (value === "__current") {
      setSelectedTemplateId(null)
      if (weekDates.startDateStr && weekDates.endDateStr) {
        await loadExistingMenu(weekDates.startDateStr, weekDates.endDateStr)
      }
      return
    }

    if (!value) return

    const menuId = Number.parseInt(value, 10)
    if (Number.isNaN(menuId)) return

    setSelectedTemplateId(value)
    await applySavedMenu(menuId)
  }

  const currentWeekBaseline = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return formatDateToIso(start)
  }, [])

  const getWeekSummary = (startIso: string) => {
    const normalizedStart = new Date(`${startIso}T00:00:00`)
    if (Number.isNaN(normalizedStart.getTime())) {
      return {
        startDateStr: startIso,
        endDateStr: startIso,
        weekText: startIso,
      }
    }
    normalizedStart.setHours(0, 0, 0, 0)
    const end = new Date(normalizedStart)
    end.setDate(normalizedStart.getDate() + 6)

    const startDateStr = formatDateToIso(normalizedStart)
    const endDateStr = formatDateToIso(end)

    const formatDisplayDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, "0")
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    const weekText = `${formatDisplayDate(normalizedStart)} al ${formatDisplayDate(end)}`

    return { startDateStr, endDateStr, weekText }
  }

  useEffect(() => {
    if (!userId) return
    setCurrentWeekStart((prev) => {
      if (prev) return prev
      if (initialWeekStart) {
        return initialWeekStart
      }
      return currentWeekBaseline
    })
  }, [currentWeekBaseline, initialWeekStart, userId])

  useEffect(() => {
    if (!initialWeekStart) return
    setCurrentWeekStart((prev) => {
      if (!prev || prev !== initialWeekStart) {
        return initialWeekStart
      }
      return prev
    })
  }, [initialWeekStart])

  useEffect(() => {
    if (!userId || !currentWeekStart) {
      return
    }

    const summary = getWeekSummary(currentWeekStart)
    setWeekDates(summary)
    setSelectedTemplateId(null)
    setIsLoading(true)

    const run = async () => {
      await loadExistingMenu(summary.startDateStr, summary.endDateStr)
      await fetchSavedMenus(summary.startDateStr)
    }

    void run()
  }, [currentWeekStart, userId])

  useEffect(() => {
    if (!weekDates.startDateStr) return
    const targetPath = `/weekly-menu/${weekDates.startDateStr}`
    if (pathname !== targetPath) {
      router.replace(targetPath)
    }
  }, [pathname, router, weekDates.startDateStr])

  useEffect(() => {
    if (isShareDialogOpen) return
    setShareEmail("")
    setShareError(null)
    setCopiedLink(false)
  }, [isShareDialogOpen])

  const goToCurrentWeek = () => {
    setCurrentWeekStart(currentWeekBaseline)
  }

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const baseIso = prev ?? currentWeekBaseline
      if (!baseIso) return prev
      const next = new Date(`${baseIso}T00:00:00`)
      if (Number.isNaN(next.getTime())) {
        return prev
      }
      next.setDate(next.getDate() + 7)
      next.setHours(0, 0, 0, 0)
      return formatDateToIso(next)
    })
  }

  const shareUrl = useMemo(() => {
    if (!weekDates.startDateStr) return ""

    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/weekly-menu/${weekDates.startDateStr}`
    }

    const envBase = process.env.NEXT_PUBLIC_APP_URL ?? ""
    if (envBase) {
      const normalizedBase = envBase.endsWith("/") ? envBase.slice(0, -1) : envBase
      return `${normalizedBase}/weekly-menu/${weekDates.startDateStr}`
    }

    return `/weekly-menu/${weekDates.startDateStr}`
  }, [weekDates.startDateStr])

  const isShareEmailValid = useMemo(() => {
    const value = shareEmail.trim()
    if (!value) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }, [shareEmail])

  const handleCopyShareLink = async () => {
    if (!shareUrl) return
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador no permite copiar automáticamente. Copia el enlace manualmente.",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error("Error copiando enlace del menú:", error)
      setCopiedLink(false)
      toast({
        title: "No se pudo copiar",
        description: "Por favor copia el enlace manualmente.",
        variant: "destructive",
      })
    }
  }

  const handleShareMenu = async () => {
    if (!weekDates.startDateStr || !isShareEmailValid || isSharing) {
      return
    }

    const targetEmail = shareEmail.trim()
    setIsSharing(true)
    setShareError(null)

    try {
      const response = await fetch("/api/weekly-menu/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          weekStart: weekDates.startDateStr,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error ?? "No se pudo enviar el menú."
        setShareError(message)
        toast({
          title: "No se pudo compartir el menú",
          description: message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Menú compartido",
        description: `Se ha enviado el enlace a ${targetEmail}.`,
      })
      setIsShareDialogOpen(false)
    } catch (error) {
      console.error("Error sharing weekly menu:", error)
      const message = error instanceof Error ? error.message : "No se pudo enviar el menú."
      setShareError(message)
      toast({
        title: "No se pudo compartir el menú",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const baselineSummary = useMemo(() => getWeekSummary(currentWeekBaseline), [currentWeekBaseline])
  const isViewingCurrentWeek = weekDates.startDateStr
    ? weekDates.startDateStr === baselineSummary.startDateStr
    : true

  const openGenerationDialog = () => {
    if (isGenerating || recipes.length === 0) {
      return
    }
    setPendingStrategy(currentStrategy)
    setShowGenerationDialog(true)
  }

  const handleConfirmGeneration = () => {
    setShowGenerationDialog(false)
    void generateRandomMenu(pendingStrategy)
  }

  const handleClearWeekRequest = () => {
    if (isClearingAll || menuEntries.length === 0) {
      return
    }
    setShowClearDialog(true)
  }

  const handleConfirmClearWeek = async () => {
    if (isClearingAll) return
    setIsClearingAll(true)

    try {
      if (existingMenuId) {
        const { error } = await supabase.from("menu_items").delete().eq("weekly_menu_id", existingMenuId)
        if (error) {
          throw error
        }
      }

      setMenuEntries([])
      toast({
        title: "Planificador vaciado",
        description: "Se eliminaron todas las comidas de la semana seleccionada.",
      })

      if (weekDates.startDateStr) {
        await fetchSavedMenus(weekDates.startDateStr)
      }
    } catch (error: any) {
      console.error("Error clearing weekly menu:", error)
      toast({
        title: "No se pudo vaciar el planificador",
        description: error?.message ?? "Inténtalo de nuevo más tarde.",
        variant: "destructive",
      })
      if (weekDates.startDateStr && weekDates.endDateStr) {
        await loadExistingMenu(weekDates.startDateStr, weekDates.endDateStr)
      }
    } finally {
      setIsClearingAll(false)
      setShowClearDialog(false)
    }
  }

  const loadExistingMenu = async (startDateStr: string, endDateStr: string) => {
    try {
      if (!userId) {
        setIsLoading(false)
        return
      }

      const startCandidates = buildStartDateCandidates(startDateStr)

      const { data: existingMenu, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", userId)
        .in("start_date", startCandidates)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (menuError && menuError.code !== "PGRST116") {
        console.error("Error buscando menú existente:", menuError)
        setIsLoading(false)
        return
      }

      if (existingMenu) {
        setExistingMenuId(existingMenu.id)
        setSelectedTemplateId(null)

        if (existingMenu.start_date && existingMenu.start_date !== startDateStr) {
          const candidateSummary = getWeekSummary(existingMenu.start_date)
          setWeekDates(candidateSummary)
          setCurrentWeekStart(existingMenu.start_date)
        }

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
          const formattedEntries = mapMenuItemsToEntries(menuItems || [])
          mergeRecipesFromEntries(formattedEntries)
          setMenuEntries(formattedEntries)
        }
      } else {
        setExistingMenuId(null)
        setSelectedTemplateId(null)
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
      await fetchSavedMenus(weekDates.startDateStr)
      
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

  function canUseCategory(cat: string, usageCounts: Record<string, number>, limit = 2) {
    if (cat === 'postre') return false
    return (usageCounts[cat] || 0) < limit
  }

  type MenuSlot = "first" | "second" | "dinner"

  function computeCandidateScore(
    strategy: MenuStrategy,
    slot: MenuSlot,
    candidate: { r: Recipe; cls: ReturnType<typeof classifyRecipe> },
  ) {
    const { cls, r } = candidate
    const caloriesEstimate =
      r.calories ??
      (cls.weight === 3 ? 850 : cls.weight === 2 ? 600 : cls.weight === 1 ? 320 : 450)

    let score = 0

    if (strategy === "healthy") {
      score += cls.healthScore * 2
      if (["vegetal", "sopa", "legumbre"].includes(cls.primaryCategory)) score += 80
      if (["pescado", "marisco"].includes(cls.primaryCategory)) score += 50
      if (slot === "second" && ["legumbre", "pescado", "pollo", "pavo"].includes(cls.primaryCategory)) score += 25
      if (cls.weight === 1) score += slot === "second" ? 10 : 35
      if (cls.weight === 3) score -= 120
      if (caloriesEstimate > 600) score -= (caloriesEstimate - 600) / 3
    } else if (strategy === "indulgent") {
      score += cls.weight * 90
      score += caloriesEstimate / 3
      if (slot === "second") score += 40
      if (slot === "dinner" && cls.weight === 3) score += 25
      if (["vegetal", "sopa", "legumbre"].includes(cls.primaryCategory)) score -= 35
      if (cls.healthScore > 60) score -= 10
    } else {
      const targetWeight = slot === "second" ? 2.5 : 1.5
      score -= Math.abs(cls.weight - targetWeight) * 65
      score += cls.healthScore
      if (["vegetal", "legumbre", "pescado", "pollo", "pavo"].includes(cls.primaryCategory)) score += 20
      if (caloriesEstimate < 450) score += 10
      if (caloriesEstimate > 750) score -= 10
    }

    return score
  }

  function generateDayMenu(
    day: string,
    strategy: MenuStrategy,
    globalUsageCounts: Record<string, number>,
    heavyUsed: { count: number },
    enrichedAll: { r: Recipe; cls: ReturnType<typeof classifyRecipe> }[],
  ) {
    const results: MenuEntry[] = []
    const usedRecipeIds = new Set<number>()
    const dayCategories = new Set<string>()
    const savoryCandidates = enrichedAll.filter((item) => !item.cls.isDessert)
    const pool = savoryCandidates.length > 0 ? savoryCandidates : enrichedAll
    const heavyLimit = HEAVY_LIMIT[strategy]
    const maxCategoryUsage = CATEGORY_USAGE_LIMIT[strategy]

    const pickCandidate = (
      slot: MenuSlot,
      opts: { minWeight?: number; maxWeight?: number; avoidCategories?: string[]; allowHeavy?: boolean } = {},
    ) => {
      let filtered = pool.filter((entry) => !usedRecipeIds.has(entry.r.id))
      if (opts.minWeight !== undefined) filtered = filtered.filter((entry) => entry.cls.weight >= opts.minWeight!)
      if (opts.maxWeight !== undefined) filtered = filtered.filter((entry) => entry.cls.weight <= opts.maxWeight!)

      const heavyAllowed = opts.allowHeavy ?? true
      if (!heavyAllowed || heavyUsed.count >= heavyLimit) {
        filtered = filtered.filter((entry) => entry.cls.weight < 3)
      }

      if (opts.avoidCategories?.length) {
        filtered = filtered.filter((entry) => !opts.avoidCategories!.includes(entry.cls.primaryCategory))
      }

      filtered = filtered.filter((entry) =>
        canUseCategory(entry.cls.primaryCategory, globalUsageCounts, maxCategoryUsage),
      )

      if (filtered.length === 0) {
        filtered = pool.filter((entry) => !usedRecipeIds.has(entry.r.id))
        if (!heavyAllowed || heavyUsed.count >= heavyLimit) {
          filtered = filtered.filter((entry) => entry.cls.weight < 3)
        }
        if (filtered.length === 0) {
          return undefined
        }
      }

      const scored = filtered.map((entry) => ({
        entry,
        score: computeCandidateScore(strategy, slot, entry),
      }))

      scored.sort((a, b) => b.score - a.score)
      const sliceSize = Math.max(1, Math.min(5, Math.ceil(scored.length * 0.4)))
      const chosen = scored.slice(0, sliceSize)[Math.floor(Math.random() * sliceSize)]?.entry
      return chosen
    }

    const commitCandidate = (candidate: { r: Recipe; cls: ReturnType<typeof classifyRecipe> }, slot: MenuSlot) => {
      const mealMeta =
        slot === "first"
          ? { meal_type: "comida", dish_order: 1 as const }
          : slot === "second"
            ? { meal_type: "comida", dish_order: 2 as const }
            : { meal_type: "cena", dish_order: 1 as const }

      results.push({
        id: Date.now() + Math.random(),
        day,
        meal_type: mealMeta.meal_type,
        dish_order: mealMeta.dish_order,
        recipe_id: candidate.r.id,
        recipe: candidate.r,
      })

      usedRecipeIds.add(candidate.r.id)
      dayCategories.add(candidate.cls.primaryCategory)
      globalUsageCounts[candidate.cls.primaryCategory] =
        (globalUsageCounts[candidate.cls.primaryCategory] || 0) + 1
      if (candidate.cls.weight === 3) {
        heavyUsed.count += 1
      }
    }

    const first = pickCandidate("first", {
      maxWeight: strategy === "indulgent" ? undefined : 2,
      allowHeavy: strategy === "indulgent" && heavyUsed.count < heavyLimit,
    })
    if (first) {
      commitCandidate(first, "first")
    }

    const second = pickCandidate("second", {
      minWeight: strategy === "healthy" ? 1 : 2,
      maxWeight: strategy === "healthy" ? 2 : undefined,
      allowHeavy: strategy !== "healthy" && heavyUsed.count < heavyLimit,
      avoidCategories:
        first && strategy !== "indulgent" ? [first.cls.primaryCategory] : undefined,
    })
    if (second) {
      commitCandidate(second, "second")
    }

    const dinner = pickCandidate("dinner", {
      maxWeight: strategy === "indulgent" ? undefined : 2,
      minWeight: strategy === "indulgent" ? 2 : undefined,
      allowHeavy: strategy === "indulgent" && heavyUsed.count < heavyLimit,
      avoidCategories:
        strategy === "indulgent" ? undefined : Array.from(dayCategories.values()),
    })
    if (dinner) {
      commitCandidate(dinner, "dinner")
    }

    return results
  }

  async function generateRandomMenu(strategy: MenuStrategy) {
    if (!recipes || recipes.length === 0) {
      toast({ title: "Sin recetas", description: "No hay recetas disponibles para generar el menú.", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      setCurrentStrategy(strategy)
      const enriched = recipes.map(r => ({ r, cls: classifyRecipe(r) }))
      const usageCounts: Record<string, number> = {}
      const heavyUsed = { count: 0 }
      const newEntries: MenuEntry[] = []
      DAYS.forEach(day => {
        const dayEntries = generateDayMenu(day, strategy, usageCounts, heavyUsed, enriched)
        newEntries.push(...dayEntries)
      })
      setMenuEntries(newEntries)
      const categoriesOverLimit = Object.entries(usageCounts).filter(([_, v]) => {
        const limit = CATEGORY_USAGE_LIMIT[strategy]
        return v > limit
      }).length

      const description =
        strategy === "healthy"
          ? categoriesOverLimit
            ? "Menú saludable con algunas repeticiones por falta de opciones ligeras."
            : "Menú saludable creado con predominio de verduras y platos ligeros."
          : strategy === "indulgent"
            ? "Menú contundente listo. ¡Prepárate para platos potentes!"
            : categoriesOverLimit
              ? "Menú equilibrado con alguna repetición por disponibilidad limitada."
              : "Menú equilibrado generado. Revisa y guarda los cambios."

      toast({ title: "Menú generado", description })
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
    const newDayEntries = generateDayMenu(day, currentStrategy, usageCounts, heavyUsed, enriched)
    setMenuEntries([...otherEntries, ...newDayEntries])
    const regenDescription =
      currentStrategy === "healthy"
        ? "Regenerado con opciones saludables."
        : currentStrategy === "indulgent"
          ? "Regenerado con platos contundentes."
          : "Ajustado con una combinación equilibrada."
    toast({ title: `Día ${day} regenerado`, description: regenDescription })
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificador Semanal
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  disabled={isLoading || isViewingCurrentWeek}
                >
                  Semana actual
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goToNextWeek}
                  disabled={isLoading}
                >
                  Próxima semana
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClearWeekRequest}
                disabled={
                  isClearingAll ||
                  isLoading ||
                  isSaving ||
                  isGenerating ||
                  isApplyingTemplate ||
                  menuEntries.length === 0
                }
                className="shrink-0"
              >
                {isClearingAll ? "Vaciando..." : "Vaciar semana"}
              </Button>
              <Select
                onValueChange={handleSavedMenuSelection}
                value={selectedTemplateId ?? ""}
              >
                <SelectTrigger
                  className="w-full sm:w-64"
                  disabled={isApplyingTemplate || (savedMenus.length === 0 && !selectedTemplateId)}
                >
                  <SelectValue
                    placeholder={savedMenus.length ? "Cargar menú guardado" : "Sin menús guardados"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {savedMenus.length ? (
                    <>
                      <SelectItem value="__current">Menú de esta semana</SelectItem>
                      {savedMenus.map((menu) => (
                        <SelectItem key={menu.id} value={String(menu.id)}>
                          {menu.label}
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <SelectItem value="__none" disabled>
                      No hay menús guardados
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openGenerationDialog}
                disabled={isGenerating || recipes.length === 0}
              >
                {isGenerating ? "Generando..." : "Generar aleatorio"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsShareDialogOpen(true)}
                disabled={
                  isLoading ||
                  isSaving ||
                  isApplyingTemplate ||
                  isGenerating ||
                  menuEntries.length === 0 ||
                  !weekDates.startDateStr
                }
                className="shrink-0"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button
                onClick={saveWeeklyMenu}
                disabled={menuEntries.length === 0 || isSaving || isApplyingTemplate}
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

                          <div className="absolute left-2 bottom-2 right-2 flex items-center justify-between">
                            {entry.recipe.user_profiles ? (
                              <div className="flex items-center gap-1 text-xs bg-black/60 text-white backdrop-blur-sm rounded px-2 py-1 w-fit">
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
                            ) : <span />}
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 flex-shrink-0 rounded-full bg-white/80 hover:bg-white"
                                title="Ver receta"
                              >
                                <Link
                                  href={`/recipes/${entry.recipe.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="h-4 w-4 text-gray-700" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => entry.id && removeRecipeFromMenu(entry.id)}
                                className="h-7 w-7 p-0 flex-shrink-0 rounded-full bg-white/80 hover:bg-white"
                                title="Eliminar receta"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
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
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartir menú</DialogTitle>
            <DialogDescription className="text-sm">
              Envía un enlace del menú seleccionado. Quien lo reciba tendrá que iniciar sesión para verlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Email del destinatario</Label>
              <Input
                id="share-email"
                type="email"
                autoComplete="email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                placeholder="persona@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-link">Enlace del menú</Label>
              <div className="flex gap-2">
                <Input id="share-link" value={shareUrl} readOnly />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyShareLink}
                  disabled={!shareUrl}
                  aria-label={copiedLink ? "Enlace copiado" : "Copiar enlace"}
                >
                  {copiedLink ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Solo usuarios registrados podrán acceder al menú con este enlace.
              </p>
            </div>
            {shareError && <p className="text-sm text-red-600">{shareError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)} disabled={isSharing}>
              Cancelar
            </Button>
            <Button
              onClick={handleShareMenu}
              disabled={!isShareEmailValid || !weekDates.startDateStr || isSharing}
            >
              {isSharing ? "Enviando..." : "Enviar menú"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showGenerationDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowGenerationDialog(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué tipo de menú quieres?</DialogTitle>
            <DialogDescription className="text-sm">
              Selecciona el estilo de menú para ajustar las recetas que se generarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={pendingStrategy}
            onValueChange={(value) => setPendingStrategy(value as MenuStrategy)}
            className="space-y-3"
          >
            {STRATEGY_OPTIONS.map((option) => {
              const optionId = `menu-strategy-${option.value}`
              return (
                <Label
                  key={option.value}
                  htmlFor={optionId}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    pendingStrategy === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/60"
                  }`}
                >
                  <RadioGroupItem id={optionId} value={option.value} className="mt-1" />
                  <div>
                    <p className="text-sm font-semibold">{option.title}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </Label>
              )
            })}
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGenerationDialog(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmGeneration} disabled={isGenerating}>
              {isGenerating ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showClearDialog && (
        <ConfirmationDialog
          isOpen
          onClose={() => setShowClearDialog(false)}
          onConfirm={handleConfirmClearWeek}
          title="Vaciar planificador"
          description="¿Seguro que quieres borrar todas las comidas planificadas de esta semana? Esta acción no se puede deshacer."
          confirmText="Vaciar semana"
          cancelText="Cancelar"
          variant="destructive"
        />
      )}
    </div>
  )
})
