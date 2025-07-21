"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, ExternalLink } from "lucide-react"
import Link from "next/link"
import ClientOnlyDateTime from "@/components/ClientOnlyDateTime"

interface DebugInfo {
  supabase: any
  openai: any
  deployment: any
  environment: any
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      // Cargar información de todas las APIs de debug
      const [supabaseRes, openaiRes, deploymentRes, envRes] = await Promise.all([
        fetch("/api/test-supabase"),
        fetch("/api/test-openai"),
        fetch("/api/debug-deployment"),
        fetch("/api/debug-env"),
      ])

      const [supabase, openai, deployment, environment] = await Promise.all([
        supabaseRes.json(),
        openaiRes.json(),
        deploymentRes.json(),
        envRes.json(),
      ])

      setDebugInfo({
        supabase: { ...supabase, status: supabaseRes.status },
        openai: { ...openai, status: openaiRes.status },
        deployment: { ...deployment, status: deploymentRes.status },
        environment: { ...environment, status: envRes.status },
      })
    } catch (error) {
      console.error("Error loading debug info:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

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

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600"
    if (status >= 400) return "text-red-600"
    return "text-yellow-600"
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Debug</h1>
          <p className="text-gray-600 mt-2">Estado general del sistema y configuraciones</p>
        </div>
        <Button onClick={loadDebugInfo} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Enlaces rápidos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enlaces de Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/debug-auth" className="flex items-center space-x-2 text-blue-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              <span>Debug Auth</span>
            </Link>
            <Link href="/debug-storage" className="flex items-center space-x-2 text-blue-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              <span>Debug Storage</span>
            </Link>
            <Link href="/debug-mobile" className="flex items-center space-x-2 text-blue-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              <span>Debug Mobile</span>
            </Link>
            <Link href="/debug-recipe-update" className="flex items-center space-x-2 text-blue-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              <span>Debug Recipe Update</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado de Supabase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Supabase
              <span className={`text-sm ${getStatusColor(debugInfo?.supabase?.status || 500)}`}>
                {debugInfo?.supabase?.status || "Error"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.supabase ? (
              <div className="space-y-2">
                <p>
                  <strong>Base de datos:</strong>{" "}
                  <span className={debugInfo.supabase.database === "connected" ? "text-green-600" : "text-red-600"}>
                    {debugInfo.supabase.database || "Error"}
                  </span>
                </p>
                <p>
                  <strong>Autenticación:</strong>{" "}
                  <span className={debugInfo.supabase.auth === "connected" ? "text-green-600" : "text-red-600"}>
                    {debugInfo.supabase.auth || "Error"}
                  </span>
                </p>
                <p>
                  <strong>Usuarios:</strong> {debugInfo.supabase.userCount || 0}
                </p>
                {debugInfo.supabase.error && <p className="text-red-600 text-sm">Error: {debugInfo.supabase.error}</p>}
              </div>
            ) : (
              <p className="text-red-600">No se pudo conectar</p>
            )}
          </CardContent>
        </Card>

        {/* Estado de OpenAI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              OpenAI
              <span className={`text-sm ${getStatusColor(debugInfo?.openai?.status || 500)}`}>
                {debugInfo?.openai?.status || "Error"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.openai ? (
              <div className="space-y-2">
                <p>
                  <strong>Configurado:</strong>{" "}
                  <span className={debugInfo.openai.configured ? "text-green-600" : "text-red-600"}>
                    {debugInfo.openai.configured ? "Sí" : "No"}
                  </span>
                </p>
                <p>
                  <strong>Modelo:</strong> {debugInfo.openai.model || "No disponible"}
                </p>
                <p>
                  <strong>Respuesta:</strong> {debugInfo.openai.response || "Sin respuesta"}
                </p>
                {debugInfo.openai.error && <p className="text-red-600 text-sm">Error: {debugInfo.openai.error}</p>}
              </div>
            ) : (
              <p className="text-red-600">No se pudo conectar</p>
            )}
          </CardContent>
        </Card>

        {/* Información de Deployment */}
        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.deployment ? (
              <div className="space-y-2">
                <p>
                  <strong>Entorno:</strong> {debugInfo.deployment.environment}
                </p>
                <p>
                  <strong>URL:</strong> {debugInfo.deployment.vercelUrl || "localhost"}
                </p>
                <p>
                  <strong>Región:</strong> {debugInfo.deployment.vercelRegion || "local"}
                </p>
                <p>
                  <strong>Next.js:</strong> {debugInfo.deployment.nextjsVersion}
                </p>
                <p>
                  <strong>Timestamp:</strong> <ClientOnlyDateTime date={debugInfo.deployment.timestamp} />
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Variables de Entorno */}
        <Card>
          <CardHeader>
            <CardTitle>Variables de Entorno</CardTitle>
          </CardHeader>
          <CardContent>
            {debugInfo?.environment ? (
              <div className="space-y-2">
                <p>
                  <strong>NODE_ENV:</strong> {debugInfo.environment.NODE_ENV}
                </p>
                <p>
                  <strong>VERCEL:</strong> {debugInfo.environment.VERCEL || "No"}
                </p>
                <p>
                  <strong>Supabase URL:</strong>{" "}
                  <span
                    className={
                      debugInfo.environment.NEXT_PUBLIC_SUPABASE_URL === "SET" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {debugInfo.environment.NEXT_PUBLIC_SUPABASE_URL}
                  </span>
                </p>
                <p>
                  <strong>Supabase Anon Key:</strong>{" "}
                  <span
                    className={
                      debugInfo.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY === "SET" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {debugInfo.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY}
                  </span>
                </p>
                <p>
                  <strong>Supabase Service Key:</strong>{" "}
                  <span
                    className={
                      debugInfo.environment.SUPABASE_SERVICE_ROLE_KEY === "SET" ? "text-green-600" : "text-red-600"
                    }
                  >
                    {debugInfo.environment.SUPABASE_SERVICE_ROLE_KEY}
                  </span>
                </p>
                <p>
                  <strong>OpenAI Key:</strong>{" "}
                  <span className={debugInfo.environment.OPENAI_API_KEY === "SET" ? "text-green-600" : "text-red-600"}>
                    {debugInfo.environment.OPENAI_API_KEY}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-gray-500">No disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Datos Raw */}
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
