"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink } from "lucide-react"

export default function FixVercelCachePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testDeployment = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug-deployment")
      const data = await response.json()

      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  const forceRedeploy = () => {
    // Abrir Vercel dashboard en nueva pestaña
    window.open("https://vercel.com/dashboard", "_blank")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Arreglar Caché de Vercel</h1>
        <p className="text-gray-600 mt-2">Herramientas para solucionar problemas de caché en Vercel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test de Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Verifica el estado actual del deployment en Vercel.</p>
            <Button onClick={testDeployment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar Deployment"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Forzar Redeploy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Abre el dashboard de Vercel para forzar un nuevo deployment.</p>
            <Button onClick={forceRedeploy} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Vercel Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pasos para Limpiar Caché de Vercel</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>Ve al dashboard de Vercel</li>
            <li>Selecciona tu proyecto</li>
            <li>Ve a la pestaña "Deployments"</li>
            <li>Haz clic en "Redeploy" en el último deployment</li>
            <li>Selecciona "Use existing Build Cache" = NO</li>
            <li>Confirma el redeploy</li>
          </ol>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>URLs de Caché a Limpiar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Página principal:</strong> /
            </p>
            <p>
              <strong>Recetas:</strong> /recipes
            </p>
            <p>
              <strong>Menú semanal:</strong> /weekly-menu
            </p>
            <p>
              <strong>Categorías:</strong> /categories
            </p>
            <p>
              <strong>APIs:</strong> /api/*
            </p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado del Test</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
