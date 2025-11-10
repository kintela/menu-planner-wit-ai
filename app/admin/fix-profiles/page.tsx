"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Users } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"

interface FixResult {
  message: string
  created: number
  missing: number
  profiles: any[]
}

export default function FixProfilesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FixResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleFixProfiles = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/fix-missing-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="container py-10 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Debes iniciar sesión para acceder a esta página.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container py-10 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reparar Perfiles de Usuario</h1>
          <p className="text-muted-foreground mt-2">
            Esta herramienta identifica usuarios registrados que no tienen un perfil asociado y los crea
            automáticamente.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Verificar y Crear Perfiles Faltantes
            </CardTitle>
            <CardDescription>
              Busca usuarios en auth.users que no tengan un registro correspondiente en user_profiles y los crea.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFixProfiles} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando y creando perfiles...
                </>
              ) : (
                "Ejecutar Reparación"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{result.message}</p>
                    <div className="text-sm">
                      <p>• Usuarios sin perfil encontrados: {result.missing}</p>
                      <p>• Perfiles creados exitosamente: {result.created}</p>
                    </div>
                    {result.profiles.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-sm">Perfiles creados:</p>
                        <ul className="text-sm list-disc list-inside ml-2">
                          {result.profiles.map((profile, index) => (
                            <li key={index}>
                              {profile.email} ({profile.role})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Esta herramienta solo puede ser ejecutada por administradores</p>
            <p>• Se verifica automáticamente si el email es de administrador</p>
            <p>• Los perfiles se crean con rol &lsquo;user_full&rsquo; por defecto</p>
            <p>• Si hay errores, se registran en los logs pero no fallan la operación</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
