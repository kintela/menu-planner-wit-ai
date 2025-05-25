"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, GitBranch, RefreshCw, Copy, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function FixVercelCachePage() {
  const { toast } = useToast()

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: `${label} copiado al portapapeles`,
    })
  }

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🚨 Problema de Caché de Vercel Preview</h1>

      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Problema Confirmado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">
              <strong>El Preview de Vercel está usando valores placeholder</strong> en lugar de las variables reales que
              tienes configuradas. Esto es un problema conocido de caché.
            </p>
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded font-mono text-sm">
              Error: NEXT_PUBLIC_SUPABASE_URL contains placeholder value: "tu_url_de_supabase_aqui"
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Solución Garantizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700 dark:text-green-300">
              <strong>Método 1: Forzar redeploy sin caché (MÁS EFECTIVO)</strong>
            </p>

            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Pasos exactos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Ve a{" "}
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    vercel.com/dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Selecciona tu proyecto del menú planner</li>
                <li>
                  Ve a la pestaña <strong>"Deployments"</strong>
                </li>
                <li>
                  Busca el deployment más reciente de tu rama <code>dev</code>
                </li>
                <li>
                  Haz clic en los <strong>3 puntos (...)</strong> al lado derecho
                </li>
                <li>
                  Selecciona <strong>"Redeploy"</strong>
                </li>
                <li>
                  <strong>🔥 CRÍTICO:</strong> Desmarca la casilla <strong>"Use existing Build Cache"</strong>
                </li>
                <li>
                  Haz clic en <strong>"Redeploy"</strong>
                </li>
                <li>Espera 2-3 minutos a que termine</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Método 2: Trigger con cambio en Git
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si el método 1 no funciona, fuerza un nuevo deployment con un cambio mínimo:
            </p>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-3">Pasos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Ve a tu repositorio en GitHub</li>
                <li>Edita cualquier archivo (por ejemplo, README.md)</li>
                <li>Añade un espacio o comentario</li>
                <li>Haz commit y push</li>
                <li>Esto forzará un deployment completamente nuevo</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 Verificar Variables en Vercel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Antes de redeplegar, verifica que estas variables estén configuradas correctamente:
            </p>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <strong>NEXT_PUBLIC_SUPABASE_URL</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard("https://iqarhmetoagfjjyfztzq.supabase.co", "URL de Supabase")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-background p-2 rounded border font-mono text-sm">
                  https://iqarhmetoagfjjyfztzq.supabase.co
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-2">
                  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (tu clave real)
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <strong>OPENAI_API_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-2">
                  sk-proj-... (tu clave real)
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">⚠️ Verificar:</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>
                  • Cada variable debe tener marcadas las 3 casillas: <strong>Production, Preview, Development</strong>
                </li>
                <li>• No debe haber espacios al principio o final de los valores</li>
                <li>
                  • La URL debe ser exactamente: <code>https://iqarhmetoagfjjyfztzq.supabase.co</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Método 3: Recrear Variables (Último Recurso)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Solo si los métodos anteriores fallan:</p>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-3">Pasos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Ve a Vercel → Settings → Environment Variables</li>
                <li>
                  <strong>Elimina</strong> NEXT_PUBLIC_SUPABASE_URL
                </li>
                <li>
                  <strong>Elimina</strong> NEXT_PUBLIC_SUPABASE_ANON_KEY
                </li>
                <li>Espera 1 minuto</li>
                <li>
                  <strong>Recrea</strong> ambas variables con los valores correctos
                </li>
                <li>Marca las 3 casillas para cada una</li>
                <li>Haz redeploy sin caché (Método 1)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-600">✅ Después del Fix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-blue-700 dark:text-blue-300">
              Una vez completado el redeploy (2-3 minutos), verifica que funciona:
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/debug">Verificar Variables</Link>
              </Button>
              <Button asChild>
                <Link href="/recipes">Probar Recetas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
