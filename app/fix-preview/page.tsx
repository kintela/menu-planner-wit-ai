"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, GitBranch, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function FixPreviewPage() {
  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔧 Solucionar Preview de Vercel</h1>

      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Problema Identificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 dark:text-amber-300">
              El Preview de Vercel tiene un problema de caché con las variables de entorno. Aunque están configuradas
              correctamente, el Preview sigue usando valores antiguos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Método 1: Forzar nuevo deployment con Git
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              La forma más efectiva de forzar que Vercel use las variables actualizadas:
            </p>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-3">Pasos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Ve a tu repositorio en GitHub:{" "}
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    github.com <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Busca tu proyecto del menú planner</li>
                <li>Haz un cambio mínimo (por ejemplo, añade un espacio en cualquier archivo README o comentario)</li>
                <li>Haz commit y push del cambio</li>
                <li>Esto forzará un nuevo deployment automáticamente</li>
                <li>Espera 2-3 minutos a que termine</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 ¿Por qué funciona esto?</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Un nuevo commit fuerza a Vercel a crear un deployment completamente nuevo, sin usar caché de variables
                de entorno.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Método 2: Recrear las variables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Si el método anterior no funciona:</p>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-3">Pasos:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Ve a Vercel → Tu proyecto → Settings → Environment Variables</li>
                <li>
                  <strong>Elimina</strong> la variable NEXT_PUBLIC_SUPABASE_URL (haz clic en los 3 puntos → Delete)
                </li>
                <li>
                  <strong>Elimina</strong> la variable NEXT_PUBLIC_SUPABASE_ANON_KEY
                </li>
                <li>Espera 30 segundos</li>
                <li>
                  <strong>Vuelve a crear</strong> NEXT_PUBLIC_SUPABASE_URL con el valor:{" "}
                  <code>https://iqarhmetoagfjjyfztzq.supabase.co</code>
                </li>
                <li>
                  <strong>Vuelve a crear</strong> NEXT_PUBLIC_SUPABASE_ANON_KEY con tu clave real
                </li>
                <li>Asegúrate de marcar las 3 casillas para cada variable</li>
                <li>Haz un nuevo deployment (método 1)</li>
              </ol>
            </div>

            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">⚠️ Importante:</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                Ten a mano los valores de las variables antes de eliminarlas para poder recrearlas exactamente igual.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Valores de las Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Para referencia, estos son los valores correctos:</p>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_URL</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1 flex justify-between items-center">
                  <span>https://iqarhmetoagfjjyfztzq.supabase.co</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText("https://iqarhmetoagfjjyfztzq.supabase.co")}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1">
                  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (tu clave real de Supabase)
                </div>
              </div>
              <div>
                <strong>OPENAI_API_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1">
                  sk-proj-... (tu clave real de OpenAI)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🎯 Método 3: Usar Production directamente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Como solución temporal, puedes usar el dominio de Production en lugar del Preview:
            </p>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Dominio de Production:</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                En lugar de usar el preview (que tiene el problema), usa directamente tu dominio de production que
                debería funcionar correctamente.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Verificar Solución</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700 dark:text-green-300">
              Después de aplicar cualquiera de los métodos anteriores:
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/debug">Verificar Variables</Link>
              </Button>
              <Button asChild>
                <Link href="/recipes">Probar Aplicación</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
