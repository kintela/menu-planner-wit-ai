import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ForceRedeployPage() {
  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">🚨 Problema de Variables de Entorno</h1>

      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Variables no aplicadas en Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">
              Aunque tienes las variables configuradas correctamente en Vercel, no se están aplicando al entorno de
              Preview. Esto es un problema común de caché.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔧 Solución: Forzar Redeploy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium">Pasos a seguir:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Ve a tu proyecto en Vercel:{" "}
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
                  Busca el deployment más reciente y haz clic en los <strong>3 puntos (...)</strong>
                </li>
                <li>
                  Selecciona <strong>"Redeploy"</strong>
                </li>
                <li>
                  <strong>IMPORTANTE:</strong> Desmarca la casilla "Use existing Build Cache" para forzar un rebuild
                  completo
                </li>
                <li>
                  Haz clic en <strong>"Redeploy"</strong>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 ¿Por qué pasa esto?</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cuando añades nuevas variables de entorno, Vercel a veces no las aplica inmediatamente al Preview. Un
                redeploy sin caché fuerza a Vercel a usar las variables actualizadas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Verificar Variables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Antes de redeplegar, verifica que estas variables estén configuradas correctamente:
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_URL</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1">
                  https://iqarhmetoagfjjyfztzq.supabase.co
                </div>
              </div>
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1">
                  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... (tu clave real)
                </div>
              </div>
              <div>
                <strong>OPENAI_API_KEY</strong>
                <div className="bg-background p-2 rounded border font-mono text-sm mt-1">
                  sk-proj-... (tu clave real)
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">⚠️ Importante:</h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Cada variable debe tener marcadas las 3 casillas: Production, Preview, Development</li>
                <li>• No debe haber espacios al principio o final de los valores</li>
                <li>• Las URLs deben empezar por https://</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Después del Redeploy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700 dark:text-green-300">
              Una vez completado el redeploy (tarda unos 2-3 minutos), prueba estos enlaces:
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
