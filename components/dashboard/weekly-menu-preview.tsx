"use server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Calendar, ChefHat } from "lucide-react"
import { ClientOnlyDate } from "@/components/ui/client-only-date"

interface WeeklyMenuPreviewProps {
  userId: string
}

export async function WeeklyMenuPreview({ userId }: WeeklyMenuPreviewProps) {
  const supabase = createServerClient()

  // Obtener el menú semanal más reciente
  const { data: latestMenu } = await supabase
    .from("weekly_menus")
    .select(`
      id,
      week_start_date,
      name,
      menu_items (
        meal_type,
        day_of_week,
        recipes (
          name
        )
      )
    `)
    .eq("user_id", userId)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          Menú Semanal Actual
        </CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/weekly-menu">Ver Completo</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {latestMenu ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">{latestMenu.name}</h3>
              <p className="text-sm text-muted-foreground">
                Semana del <ClientOnlyDate date={latestMenu.week_start_date} />
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {daysOfWeek.slice(0, 4).map((day, index) => {
                const dayItems = latestMenu.menu_items?.filter((item) => item.day_of_week === index) || []
                return (
                  <div key={day} className="border rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">{day}</h4>
                    {dayItems.length > 0 ? (
                      <div className="space-y-1">
                        {dayItems.map((item, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-center">
                            <ChefHat className="mr-1 h-3 w-3" />
                            {Array.isArray(item.recipes)
                              ? ((item.recipes as any)[0]?.name || "Sin receta")
                              : (item as any).recipes?.name || "Sin receta"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin planificar</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No hay menú semanal</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer menú semanal para empezar a planificar tus comidas
            </p>
            <Button asChild>
              <Link href="/weekly-menu">Crear Menú Semanal</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
