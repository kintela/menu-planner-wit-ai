"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import ClientOnlyDateTime from "@/components/ClientOnlyDateTime"

interface AuthDebugInfo {
  user: any
  session: any
  profile: any
  error: string | null
  timestamp: string
}

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Obtener usuario y sesión
      const {
        data: { user, session },
        error: authError,
      } = await supabase.auth.getUser()

      let profile = null
      let profileError = null

      // Si hay usuario, obtener perfil
      if (user) {
        const { data: profileData, error: profError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        profile = profileData
        profileError = profError
      }

      setDebugInfo({
        user,
        session,
        profile,
        error: authError?.message || profileError?.message || null,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error loading debug info:", error)
      setDebugInfo({
        user: null,
        session: null,
        profile: null,
        error: error instanceof Error ? error.message : "Error desconocido",
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    loadDebugInfo()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando información de debug...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug de Autenticación</h1>
          <p className="text-gray-600 mt-2">Información detallada del estado de autenticación</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadDebugInfo} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          {debugInfo?.user && (
            <Button onClick={handleSignOut} variant="destructive">
              Cerrar Sesión
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado de Usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.user ? (
              <div className="space-y-2">
                <p>
                  <strong>ID:</strong> {debugInfo.user.id}
                </p>
                <p>
                  <strong>Email:</strong> {debugInfo.user.email}
                </p>
                <p>
                  <strong>Email confirmado:</strong> {debugInfo.user.email_confirmed_at ? "Sí" : "No"}
                </p>
                <p>
                  <strong>Último login:</strong> {debugInfo.user.last_sign_in_at || "Nunca"}
                </p>
                <p>
                  <strong>Creado:</strong> {debugInfo.user.created_at}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No hay usuario autenticado</p>
            )}
          </CardContent>
        </Card>

        {/* Estado de Sesión */}
        <Card>
          <CardHeader>
            <CardTitle>Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.session ? (
              <div className="space-y-2">
                <p>
                  <strong>Token válido:</strong> Sí
                </p>
                <p>
                  <strong>Expira:</strong> <ClientOnlyDateTime date={debugInfo.session.expires_at * 1000} />
                </p>
                <p>
                  <strong>Tipo de token:</strong> {debugInfo.session.token_type}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No hay sesión activa</p>
            )}
          </CardContent>
        </Card>

        {/* Perfil de Usuario */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.profile ? (
              <div className="space-y-2">
                <p>
                  <strong>Nombre completo:</strong> {debugInfo.profile.full_name || "No definido"}
                </p>
                <p>
                  <strong>Alias:</strong> {debugInfo.profile.alias || "No definido"}
                </p>
                <p>
                  <strong>Rol:</strong> {debugInfo.profile.role}
                </p>
                <p>
                  <strong>Email del perfil:</strong> {debugInfo.profile.email}
                </p>
                <p>
                  <strong>Avatar:</strong> {debugInfo.profile.avatar_url ? "Configurado" : "No configurado"}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No se pudo cargar el perfil</p>
            )}
          </CardContent>
        </Card>

        {/* Errores */}
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.error ? (
              <div className="text-red-600">
                <p>
                  <strong>Error:</strong> {debugInfo.error}
                </p>
              </div>
            ) : (
              <p className="text-green-600">Todo funcionando correctamente</p>
            )}
            <p className="text-sm text-gray-500 mt-4">
              <strong>Última actualización:</strong> {debugInfo?.timestamp}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* JSON Raw */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Datos Raw (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
