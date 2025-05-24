"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface DebugData {
  timestamp: string
  environment: string
  vercel: {
    region: string
    env: string
  }
  supabase: {
    url: {
      exists: boolean
      value: string
      isPlaceholder: boolean
      isValid: boolean
      error: string
      length: number
    }
    key: {
      exists: boolean
      isPlaceholder: boolean
      length: number
      prefix: string
    }
  }
  openai: {
    exists: boolean
    isValid: boolean
    error: string
    length: number
    prefix: string
  }
  allEnvVars: {
    supabase: string[]
    openai: string[]
    nextPublic: string[]
  }
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/debug-env")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Información copiada al portapapeles",
    })
  }

  const getStatusIcon = (isValid: boolean, hasError = false) => {
    if (hasError) return <XCircle className="h-5 w-5 text-red-500" />
    if (isValid) return <CheckCircle className="h-5 w-5 text-green-500" />
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = (isValid: boolean, hasError = false) => {
    if (hasError) return <Badge variant="destructive">Error</Badge>
    if (isValid)
      return (
        <Badge variant="default" className="bg-green-600">
          OK
        </Badge>
      )
    return <Badge variant="secondary">Advertencia</Badge>
  }

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Verificando configuración...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error al verificar configuración</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <Button onClick={fetchDebugData} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const hasSupabaseIssues =
    data.supabase.url.isPlaceholder || !data.supabase.url.isValid || data.supabase.key.isPlaceholder
  const hasOpenAIIssues = data.openai.exists && !data.openai.isValid

  return (
    <div className="container py-10 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Diagnóstico de Variables de Entorno</h1>
        <Button onClick={fetchDebugData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="space-y-6">
        {/* Resumen */}
        <Card
          className={hasSupabaseIssues || hasOpenAIIssues ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(!hasSupabaseIssues && !hasOpenAIIssues)}
              Estado General
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasSupabaseIssues ? (
              <p className="text-red-700">
                ❌ <strong>Problema detectado:</strong> Las variables de Supabase tienen valores placeholder o son
                inválidas.
              </p>
            ) : hasOpenAIIssues ? (
              <p className="text-red-700">
                ❌ <strong>Problema detectado:</strong> La variable de OpenAI no es válida.
              </p>
            ) : (
              <p className="text-green-700">
                ✅ <strong>Todo correcto:</strong> Las variables están configuradas correctamente.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Información del entorno */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Entorno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Entorno:</strong> {data.environment}
              </div>
              <div>
                <strong>Vercel Env:</strong> {data.vercel.env}
              </div>
              <div>
                <strong>Región:</strong> {data.vercel.region}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(data.timestamp).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variables de Supabase */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(!hasSupabaseIssues, hasSupabaseIssues)}
              Variables de Supabase
              {getStatusBadge(!hasSupabaseIssues, hasSupabaseIssues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">NEXT_PUBLIC_SUPABASE_URL</h4>
              <div className="bg-muted p-3 rounded font-mono text-sm">{data.supabase.url.value}</div>
              <div className="flex gap-2 text-sm">
                <Badge variant={data.supabase.url.exists ? "default" : "destructive"}>
                  {data.supabase.url.exists ? "Existe" : "No existe"}
                </Badge>
                <Badge variant={data.supabase.url.isPlaceholder ? "destructive" : "default"}>
                  {data.supabase.url.isPlaceholder ? "Es placeholder" : "Valor real"}
                </Badge>
                <Badge variant={data.supabase.url.isValid ? "default" : "destructive"}>
                  {data.supabase.url.isValid ? "URL válida" : "URL inválida"}
                </Badge>
              </div>
              {data.supabase.url.error && <p className="text-red-600 text-sm">Error: {data.supabase.url.error}</p>}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY</h4>
              <div className="bg-muted p-3 rounded font-mono text-sm">{data.supabase.key.prefix}</div>
              <div className="flex gap-2 text-sm">
                <Badge variant={data.supabase.key.exists ? "default" : "destructive"}>
                  {data.supabase.key.exists ? "Existe" : "No existe"}
                </Badge>
                <Badge variant={data.supabase.key.isPlaceholder ? "destructive" : "default"}>
                  {data.supabase.key.isPlaceholder ? "Es placeholder" : "Valor real"}
                </Badge>
                <Badge variant="outline">{data.supabase.key.length} caracteres</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variables de OpenAI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(data.openai.isValid, hasOpenAIIssues)}
              Variables de OpenAI
              {getStatusBadge(data.openai.isValid, hasOpenAIIssues)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">OPENAI_API_KEY</h4>
              <div className="bg-muted p-3 rounded font-mono text-sm">{data.openai.prefix}</div>
              <div className="flex gap-2 text-sm">
                <Badge variant={data.openai.exists ? "default" : "destructive"}>
                  {data.openai.exists ? "Existe" : "No existe"}
                </Badge>
                <Badge variant={data.openai.isValid ? "default" : "destructive"}>
                  {data.openai.isValid ? "Formato válido" : "Formato inválido"}
                </Badge>
                <Badge variant="outline">{data.openai.length} caracteres</Badge>
              </div>
              {data.openai.error && <p className="text-red-600 text-sm">Error: {data.openai.error}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Soluciones */}
        {(hasSupabaseIssues || hasOpenAIIssues) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-600">🔧 Soluciones Recomendadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSupabaseIssues && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Para Supabase:</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li>Ve a tu proyecto en Vercel → Settings → Environment Variables</li>
                    <li>Busca las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                    <li>Reemplaza los valores placeholder con los valores reales de tu proyecto Supabase</li>
                    <li>Asegúrate de marcar las 3 casillas: Production, Preview, Development</li>
                    <li>Guarda y redespliega</li>
                  </ol>
                </div>
              )}

              {hasOpenAIIssues && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Para OpenAI:</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li>Verifica que tu API key de OpenAI empiece por "sk-"</li>
                    <li>Ve a platform.openai.com/api-keys para generar una nueva si es necesario</li>
                    <li>Actualiza la variable OPENAI_API_KEY en Vercel</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información técnica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Información Técnica
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Variables Supabase detectadas:</strong> {data.allEnvVars.supabase.join(", ") || "Ninguna"}
              </div>
              <div>
                <strong>Variables OpenAI detectadas:</strong> {data.allEnvVars.openai.join(", ") || "Ninguna"}
              </div>
              <div>
                <strong>Variables NEXT_PUBLIC detectadas:</strong> {data.allEnvVars.nextPublic.join(", ") || "Ninguna"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
