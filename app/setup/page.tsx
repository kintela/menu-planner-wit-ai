import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function SetupPage() {
  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Configuración de Variables de Entorno</h1>

      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Configuración Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 dark:text-amber-300">
              Tu aplicación necesita variables de entorno configuradas para funcionar correctamente.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>1. Obtener Variables de Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Pasos:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Ve a{" "}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    supabase.com/dashboard <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Selecciona tu proyecto</li>
                <li>
                  Ve a <strong>Settings</strong> → <strong>API</strong>
                </li>
                <li>Copia los siguientes valores:</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <Badge variant="outline" className="mb-2">
                  Project URL
                </Badge>
                <div className="bg-background p-2 rounded border font-mono text-sm">
                  https://tu-proyecto-id.supabase.co
                </div>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">
                  anon public
                </Badge>
                <div className="bg-background p-2 rounded border font-mono text-sm">
                  eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Obtener API Key de OpenAI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Pasos:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Ve a{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    platform.openai.com/api-keys <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  Haz clic en <strong>"Create new secret key"</strong>
                </li>
                <li>
                  Copia la clave (empieza por <code>sk-</code>)
                </li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <Badge variant="outline" className="mb-2">
                API Key
              </Badge>
              <div className="bg-background p-2 rounded border font-mono text-sm">sk-proj-...</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Configurar en Vercel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Pasos:</h3>
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
                <li>Selecciona tu proyecto</li>
                <li>
                  Ve a <strong>Settings</strong> → <strong>Environment Variables</strong>
                </li>
                <li>Añade estas 3 variables:</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    Nombre
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">NEXT_PUBLIC_SUPABASE_URL</div>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    Valor
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">
                    https://tu-proyecto-id.supabase.co
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    Nombre
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </div>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    Valor
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">
                    eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Badge variant="outline" className="mb-2">
                    Nombre
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">OPENAI_API_KEY</div>
                </div>
                <div>
                  <Badge variant="outline" className="mb-2">
                    Valor
                  </Badge>
                  <div className="bg-background p-2 rounded border font-mono text-sm">sk-proj-...</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">⚠️ Importante:</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>
                  • Marca las 3 casillas: <strong>Production</strong>, <strong>Preview</strong>,{" "}
                  <strong>Development</strong>
                </li>
                <li>
                  • Haz clic en <strong>"Save"</strong> para cada variable
                </li>
                <li>
                  • Después de añadir todas, haz <strong>"Redeploy"</strong> en la pestaña Deployments
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              4. Verificar Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700 dark:text-green-300">
              Una vez configuradas las variables y redesplegado, usa estos enlaces para verificar:
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/api/debug-env">Verificar Variables</Link>
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
