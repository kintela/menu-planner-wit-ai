import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { WeeklyMenu } from "@/lib/types"

// Forzar renderizado dinámico
export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const supabase = createServerClient()

  // Obtener todos los menús semanales guardados
  const today = new Date()
  const { data: weeklyMenus } = await supabase
    .from("weekly_menus")
    .select("*")
    .eq("is_saved", true)
    .order("saved_at", { ascending: false })

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Historial de Menús</h1>

      {weeklyMenus && weeklyMenus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weeklyMenus.map((menu: WeeklyMenu) => (
            <Card key={menu.id}>
              <CardHeader>
                <CardTitle>{menu.name || `Menú del ${menu.start_date} al ${menu.end_date}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Desde {new Date(menu.start_date).toLocaleDateString()} hasta{" "}
                  {new Date(menu.end_date).toLocaleDateString()}
                </p>
                {menu.saved_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Guardado el {new Date(menu.saved_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/history/${menu.id}`}>Ver Detalles</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hay menús anteriores en el historial.</p>
        </div>
      )}
    </div>
  )
}
