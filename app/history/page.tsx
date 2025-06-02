"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { WeeklyMenu } from "@/lib/types"
import { getCurrentUserProfile } from "@/lib/auth"

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [weeklyMenus, setWeeklyMenus] = useState<WeeklyMenu[]>([])
  const supabase = getSupabaseClient()
  const profile = getCurrentUserProfile()

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

  if (!profile || !user) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Historial</h1>
        <p className="text-gray-600 mt-2">Revisa tu actividad reciente en la aplicación</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Esta funcionalidad está en desarrollo.</p>
        <p className="text-sm text-gray-500 mt-2">
          Pronto podrás ver tu historial de recetas creadas, menús planificados y más.
        </p>
      </div>
    </div>
  )
}
