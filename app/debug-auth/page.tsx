"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()

        // Verificar variables de entorno
        const envVars = {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Configurada" : "No configurada",
          supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configurada" : "No configurada",
        }

        // Verificar sesión
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        // Verificar usuario
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        // Información del navegador
        const browserInfo = {
          userAgent: navigator.userAgent,
          cookiesEnabled: navigator.cookieEnabled,
          platform: navigator.platform,
          language: navigator.language,
        }

        setDebugInfo({
          envVars,
          session: session ? "Sesión activa" : "Sin sesión",
          sessionError: sessionError?.message || "Sin errores",
          user: user ? `Usuario: ${user.email}` : "Sin usuario",
          userError: userError?.message || "Sin errores",
          browserInfo,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p>Cargando información de debug...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug de Autenticación</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones de Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Ir a Login
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
          >
            Ir a Inicio
          </button>
          <button onClick={() => window.location.reload()} className="bg-gray-500 text-white px-4 py-2 rounded">
            Recargar Página
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
