"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, GitBranch, ExternalLink } from "lucide-react"

export default function ForceRedeployPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const triggerRedeploy = async () => {
    setLoading(true)
    setResult("Iniciando proceso de redeploy...")

    try {
      // Simular un cambio que fuerce el redeploy
      const timestamp = new Date().toISOString()
      const response = await fetch("/api/debug-deployment")
      const data = await response.json()

      setResult(`
Redeploy iniciado en: ${timestamp}

Información del deployment actual:
${JSON.stringify(data, null, 2)}

Para completar el redeploy:
1. Ve al dashboard de Vercel
2. Selecciona el proyecto
3. Haz clic en "Redeploy" en el último deployment
4. Confirma la acción
      `)
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setLoading(false)
    }
  }

  const openVercelDashboard = () => {
    window.open("https://vercel.com/dashboard", "_blank")
  }

  const openGitHub = () => {
    // Asumiendo que el repo está en GitHub
    window.open("https://github.com", "_blank")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Forzar Redeploy</h1>
        <p className="text-gray-600 mt-2">Herramientas para forzar un nuevo deployment en Vercel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trigger Redeploy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Inicia el proceso de redeploy y obtén información del deployment.</p>
            <Button onClick={triggerRedeploy} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Iniciar Redeploy
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vercel Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Abre el dashboard de Vercel para gestionar deployments.</p>
            <Button onClick={openVercelDashboard} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Vercel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GitHub</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Abre GitHub para hacer un commit que fuerce el redeploy.</p>
            <Button onClick={openGitHub} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir GitHub
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Métodos para Forzar Redeploy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Método 1: Desde Vercel Dashboard</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Ve al dashboard de Vercel</li>
                <li>Selecciona tu proyecto</li>
                <li>Ve a la pestaña "Deployments"</li>
                <li>Haz clic en los tres puntos del último deployment</li>
                <li>Selecciona "Redeploy"</li>
                <li>Confirma la acción</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold">Método 2: Commit en GitHub</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Haz un pequeño cambio en cualquier archivo</li>
                <li>Commit y push a la rama principal</li>
                <li>Vercel detectará el cambio automáticamente</li>
                <li>Se iniciará un nuevo deployment</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold">Método 3: Webhook</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Ve a la configuración del proyecto en Vercel</li>
                <li>Busca "Deploy Hooks"</li>
                <li>Crea un nuevo hook</li>
                <li>Usa la URL del webhook para triggear deployments</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm whitespace-pre-wrap">{result}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
