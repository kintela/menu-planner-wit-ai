"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
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
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getCurrentWeekStartDate = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(today.getDate() - daysToSubtract)
    return startOfWeek.toISOString().split("T")[0]
  }

  const loadDataForWeek = async (weekStartDate: string) => {
    if (!user) {
      console.log("No user found, skipping data load")
      return
    }

    try {
      console.log("🔄 Cargando datos del menú semanal para fecha:", weekStartDate)
      console.log("🔍 Usuario para búsqueda:", user?.id)

      const endOfWeek = new Date(weekStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endDate = endOfWeek.toISOString().split("T")[0]

      // Buscar menú semanal existente para la semana específica
      const { data: weeklyMenuData, error: menuError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("start_date", weekStartDate)
        .eq("end_date", endDate)
        .eq("user_id", user?.id)
        .maybeSingle()

      if (menuError) {
        console.error("Error fetching weekly menu:", menuError)
        throw menuError
      }

      console.log("📅 Menú semanal encontrado:", weeklyMenuData)
      setWeeklyMenu(weeklyMenuData)

      // Obtener items del menú si existe
      let menuItemsData: MenuItem[] = []
      if (weeklyMenuData) {
        const { data: items, error: itemsError } = await supabase
          .from("menu_items")
          .select(`
            *,
            recipe:recipe_id (*)
          `)
          .eq("weekly_menu_id", weeklyMenuData.id)
          .order("day_of_week")
          .order("meal_type")
          .order("dish_order")

        if (itemsError) {
          console.error("Error fetching menu items:", itemsError)
          throw itemsError
        }

        if (items) {
          menuItemsData = items as unknown as MenuItem[]
          console.log("🍽️ Items del menú cargados:", menuItemsData.length, "items")
        }
      }

      setMenuItems(menuItemsData)

      // Obtener todas las recetas (solo una vez)
      if (recipes.length === 0) {
        const { data: recipesData, error: recipesError } = await supabase.from("recipes").select("*").order("name")

        if (recipesError) {
          console.error("Error fetching recipes:", recipesError)
          throw recipesError
        }

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
      setError(null)

      if (!user) {
        console.log("No user authenticated, skipping data load")
        setLoading(false)
        return
      }

      console.log("🔄 Cargando datos del menú semanal para usuario:", user?.email)

      // Calcular fechas de la semana actual
      const startDateStr = getCurrentWeekStartDate()
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
    if (!user) return

    try {
      const { data: historyData, error } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("user_id", user?.id)
        .order("start_date", { ascending: false })

      if (error) {
        console.error("Error loading menu history:", error)
        return
      }

      setMenuHistory(historyData || [])
    } catch (err) {
      console.error("Error loading menu history:", err)
    }
  }

  useEffect(() => {
    if (!mounted) return

    console.log("Auth loading:", authLoading, "User:", user?.email)

    if (authLoading) {
      console.log("Still loading auth, waiting...")
      return
    }

    if (!user) {
      console.log("No user found, stopping loading")
      setLoading(false)
      return
    }

    console.log("User found, loading data...")
    loadData()
    loadMenuHistory()
  }, [user, authLoading, mounted])

  const handleDataUpdate = () => {
    console.log("🔄 Recargando datos...")
    if (startDate && user) {
      loadDataForWeek(startDate)
    }
  }

  const handleWeekChange = async (newStartDate: string) => {
    if (!user) return

    setLoading(true)
    setStartDate(newStartDate)

    try {
      // Calcular la fecha de fin
      const endOfWeek = new Date(newStartDate)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      const endDate = endOfWeek.toISOString().split("T")[0]

      console.log("🔍 Buscando menú existente para:", newStartDate, "al", endDate)
      console.log("🔍 Usuario actual:", user?.id)
      console.log("🔍 Fechas calculadas:", { newStartDate, endDate })

      // Buscar si ya existe un menú para esta semana
      const { data: existingMenu, error: searchError } = await supabase
        .from("weekly_menus")
        .select("*")
        .eq("start_date", newStartDate)
        .eq("end_date", endDate)
        .eq("user_id", user?.id)
        .maybeSingle()

      if (searchError) {
        console.error("Error buscando menú:", searchError)
        throw searchError
      }

      if (existingMenu) {
        // Si existe, cargar sus datos
        console.log("✅ Menú existente encontrado:", existingMenu.name)
        await loadDataForWeek(newStartDate)

        toast({
          title: "Menú cargado",
          description: `Se ha cargado el menú existente para esta semana`,
        })
      } else {
        // Si no existe, crear un nuevo menú semanal
        console.log("📝 Creando nuevo menú para la semana")

        const formatDateToDDMMYYYY = (dateString: string): string => {
          const date = new Date(dateString)
          return date.toLocaleDateString("es-ES")
        }

        const { data: newMenu, error: createError } = await supabase
          .from("weekly_menus")
          .insert({
            name: `Menú del ${formatDateToDDMMYYYY(newStartDate)} al ${formatDateToDDMMYYYY(endDate)}`,
            start_date: newStartDate,
            end_date: endDate,
            user_id: user?.id,
            is_saved: false, // Inicialmente no guardado
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creando menú:", createError)
          throw createError
        }

        // Establecer el nuevo menú y limpiar los items
        setWeeklyMenu(newMenu)
        setMenuItems([])

        // Cargar las recetas si no están cargadas
        if (recipes.length === 0) {
          const { data: recipesData, error: recipesError } = await supabase.from("recipes").select("*").order("name")

          if (recipesError) {
            console.error("Error loading recipes:", recipesError)
          } else {
            setRecipes(recipesData || [])
          }
        }

        console.log("✅ Nuevo menú semanal creado:", newMenu.name)

        toast({
          title: "Nuevo menú creado",
          description: `Se ha creado un nuevo menú para la semana del ${formatDateToDDMMYYYY(newStartDate)}`,
        })
      }
    } catch (error) {
      console.error("❌ Error al cambiar de semana:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al cambiar de semana.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMenuSelect = async (selectedMenu: WeeklyMenu) => {
    if (!user) return

    setLoading(true)
    try {
      // Set the selected menu as current
      setWeeklyMenu(selectedMenu)
      setStartDate(selectedMenu.start_date)

      // Load menu items for the selected menu
      const { data: items, error } = await supabase
        .from("menu_items")
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .eq("weekly_menu_id", selectedMenu.id)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (error) {
        console.error("Error loading menu items:", error)
        throw error
      }

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

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8" suppressHydrationWarning>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show login required if no user
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold">Planificador de Menús Semanales</h1>
          <p className="text-lg text-muted-foreground">
            Necesitas iniciar sesión para acceder al planificador de menús
          </p>
          <Link href="/login">
            <Button size="lg">Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Show loading while data is loading
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid gap-4 md:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show error if there's an error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
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
              <Button
                onClick={() => {
                  setError(null)
                  loadData()
                }}
              >
                Reintentar
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

  // Show the weekly menu view
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Mi Menú Semanal</h1>
          <p className="text-muted-foreground">Planifica tus comidas y cenas para toda la semana</p>
        </div>

        <div className="grid gap-4 md:grid-cols-7">
          {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => (
            <div key={day} className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-center">{day}</h3>

              <div className="space-y-2">
                <div className="text-sm font-medium">Comida</div>
                <div className="min-h-[60px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  Añadir receta
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Cena</div>
                <div className="min-h-[60px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  Añadir receta
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button>Guardar Menú</Button>
        </div>
      </div>
    </div>
  )
}
