import { createServerClient } from "@/lib/supabase/server"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import type { MenuItem, Recipe } from "@/lib/types"

// Forzar renderizado dinámico
export const dynamic = "force-dynamic"

export default async function WeeklyMenuPage() {
  try {
    const supabase = createServerClient()

    // Obtener el menú semanal actual o crear uno nuevo
    const today = new Date()
    const startOfWeek = new Date(today)
    // Cambiar para que empiece en lunes (1) en lugar de domingo (0)
    const dayOfWeek = today.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Si es domingo (0), restar 6 días, sino restar (día - 1)
    startOfWeek.setDate(today.getDate() - daysToSubtract)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // Sábado

    // Formatear fechas para Postgres
    const startDate = startOfWeek.toISOString().split("T")[0]
    const endDate = endOfWeek.toISOString().split("T")[0]

    // Buscar si ya existe un menú para esta semana
    const { data: weeklyMenu } = await supabase
      .from("weekly_menus")
      .select("*")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .single()

    // Obtener los platos del menú
    let menuItems: MenuItem[] = []
    if (weeklyMenu) {
      const { data: items } = await supabase
        .from("menu_items")
        .select(`
          *,
          recipe:recipe_id (*)
        `)
        .eq("weekly_menu_id", weeklyMenu.id)
        .order("day_of_week")
        .order("meal_type")
        .order("dish_order")

      if (items) {
        menuItems = items as unknown as MenuItem[]
      }
    }

    // Obtener todas las recetas para el selector
    const { data: recipes } = await supabase.from("recipes").select("*").order("name")

    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
        <WeeklyMenuView
          weeklyMenu={weeklyMenu || null}
          menuItems={menuItems}
          initialRecipes={(recipes as Recipe[]) || []}
          startDate={startDate}
        />
      </div>
    )
  } catch (error) {
    console.error("Error in WeeklyMenuPage:", error)

    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Menú Semanal</h1>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700 dark:text-red-300">
              No se puede connectar a la base de datos. Esto suele ocurrir cuando las variables de entorno no están
              configuradas correctamente.
            </p>
            <div className="bg-red-100 dark:bg-red-900 p-4 rounded-md">
              <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Variables requeridas:</h3>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <li>• NEXT_PUBLIC_SUPABASE_URL</li>
                <li>• NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              Si eres el administrador, verifica que estas variables estén configuradas en Vercel y marcadas para todos
              los entornos (Production, Preview, Development).
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recipes">Ver Recetas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
