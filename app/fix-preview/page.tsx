"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function FixPreviewPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const forceRevalidation = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Forzar revalidación de varias rutas
      const routes = ["/", "/recipes", "/weekly-menu", "/categories"]

      const promises = routes.map(async (route) => {
        try {
          const response = await fetch(`/api/revalidate?path=${route}`, {
            method: "POST",
          })
          return { route, success: response.ok, status: response.status }
        } catch (error) {
          return { route, success: false, error: error instanceof Error ? error.message : "Error" }
        }
      })

      const results = await Promise.all(promises)
      setResult(JSON.stringify(results, null, 2))
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Limpiar localStorage
      localStorage.clear()

      // Limpiar sessionStorage
      sessionStorage.clear()

      // Forzar recarga de la página
      window.location.reload()
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Arreglar Preview</h1>
        <p className="text-gray-600 mt-2">Herramientas para solucionar problemas de caché y preview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revalidar Rutas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Fuerza la revalidación de las rutas principales de la aplicación.</p>
            <Button onClick={forceRevalidation} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revalidando...
                </>
              ) : (
                "Revalidar Rutas"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limpiar Caché Local</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Limpia el localStorage, sessionStorage y recarga la página completamente.
            </p>
            <Button onClick={clearCache} disabled={loading} variant="destructive">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Limpiando...
                </>
              ) : (
                "Limpiar Caché"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{result}</pre>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>User Agent:</strong> {navigator.userAgent}
            </p>
            <p>
              <strong>URL actual:</strong> {window.location.href}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date().toISOString()}
            </p>
            <p>
              <strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
