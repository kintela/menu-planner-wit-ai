"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { WeeklyMenu } from "@/lib/types"

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenu[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Obtener menús semanales si el usuario está autenticado
          const { data: menus } = await supabase
            .from("weekly_menus")
            .select("*")
            .eq("is_saved", true)
            .order("saved_at", { ascending: false })

          setWeeklyMenus(menus || [])
        }
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setWeeklyMenus([])
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Historial</h1>
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Historial</h1>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-yellow-700 dark:text-yellow-300">
              Necesitas iniciar sesión para acceder al historial de menús.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/login?redirect=/history">Iniciar Sesión</Link>
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
