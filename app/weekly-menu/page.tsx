"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getSupabaseClient } from "@/lib/supabase/client"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import type { MenuItem, Recipe, WeeklyMenu } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function WeeklyMenuPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [startDate, setStartDate] = useState<string>("")
  const [menuHistory, setMenuHistory] = useState<WeeklyMenu[]>([])
  const { toast } = useToast()

  const loadDataForWeek = async (weekStartDate: string) => {
    try {
      console.log("🔄 Cargando datos del menú semanal para fecha:", weekStartDate)
      const supabase = getSupabaseClient()

      const endOfWeek = new Date(weekStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endDate = endOfWeek.toISOString().split("T")[0]

      // Buscar menú semanal existente para la semana específica
      const { data: weeklyMenuData } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("start_date", weekStartDate)
        .eq("end_date", endDate)
        .eq("user_id", user?.id)
        .maybeSingle()

      console.log("📅 Menú semanal encontrado:", weeklyMenuData)
      setWeeklyMenu(weeklyMenuData)

      // Obtener items del menú si existe
      let menuItemsData: MenuItem[] = []
      if (weeklyMenuData) {
        const { data: items } = await supabase
          .from("menu_items")
          .select(`
            *,
            recipe:recipe_id (*)
          `)
          .eq("weekly_menu_id", weeklyMenuData.id)
          .order("day_of_week")
          .order("meal_type")
          .order("dish_order")

        if (items) {
          menuItemsData = items as unknown as MenuItem[]
          console.log("🍽️ Items del menú cargados:", menuItemsData.length, "items")
        }
      }

      setMenuItems(menuItemsData)

      // Obtener todas las recetas (solo una vez)
      if (recipes.length === 0) {
        const { data: recipesData } = await supabase.from("recipes").select("*").order("name")
        setRecipes(recipesData || [])
        console.log("📝 Recetas cargadas:", recipesData?.length || 0, "recetas")
      }

      console.log("✅ Datos cargados correctamente para la semana:", weekStartDate)
    } catch (err) {
      console.error("❌ Error cargando datos:", err)
      setError("Error al cargar los datos del menú semanal")
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("🔄 Cargando datos del menú semanal para usuario:", user?.email)
      const supabase = getSupabaseClient()

      // Calcular fechas de la semana actual
      const today = new Date()
      const startOfWeek = new Date(today)
      const dayOfWeek = today.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startOfWeek.setDate(today.getDate() - daysToSubtract)

      const startDateStr = startOfWeek.toISOString().split("T")[0]
      setStartDate(startDateStr)

      // Cargar datos para la semana actual
      await loadDataForWeek(startDateStr)

      console.log("✅ Datos cargados correctamente")
    } catch (err) {
      console.error("❌ Error cargando datos:", err)
      setError("Error al cargar los datos del menú semanal")
    } finally {
      setLoading(false)
    }
  }

  const loadMenuHistory = async () => {
    try {
      const supabase = getSupabaseClient()

      const { data: historyData } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", user?.id)
        .order("start_date", { ascending: false })

      setMenuHistory(historyData || [])
    } catch (err) {
      console.error("Error loading menu history:", err)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setLoading(false)
      return
    }

    loadData()
    loadMenuHistory()
  }, [user, authLoading])

  const handleDataUpdate = () => {
    console.log("🔄 Recargando datos...")
    loadDataForWeek(startDate)
  }

  const handleWeekChange = async (newStartDate: string) => {
    setLoading(true)
    setStartDate(newStartDate)
    await loadDataForWeek(newStartDate)
    setLoading(false)
  }

  const handleMenuSelect = async (selectedMenu: WeeklyMenu) => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()

      // Set the selected menu as current
      setWeeklyMenu(selectedMenu)
      setStartDate(selectedMenu.start_date)

      // Load menu items for the selected menu
      const { data: items } = await supabase
        .from("menu_items")
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .eq("weekly_menu_id", selectedMenu.id)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (items) {
        setMenuItems(items as unknown as MenuItem[])
      } else {
        setMenuItems([])
      }

      console.log("✅ Menú histórico cargado:", selectedMenu.name)
    } catch (error) {
      console.error("Error loading selected menu:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al cargar el menú seleccionado.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              Necesitas iniciar sesión para acceder al planificador de menú semanal.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/login?redirect=/weekly-menu">Iniciar Sesión</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
      <div className="flex items-center justify-between mb-4">
        <div>
          <WeeklyMenuView
            weeklyMenu={weeklyMenu}
            menuItems={menuItems}
            initialRecipes={recipes}
            startDate={startDate}
            onDataUpdate={handleDataUpdate}
            menuHistory={menuHistory}
            onMenuSelect={handleMenuSelect}
            onWeekChange={handleWeekChange}
          />
        </div>
      </div>
    </div>
  )
}
