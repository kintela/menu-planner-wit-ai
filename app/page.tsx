"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ChefHat, Calendar, BookOpen, Info } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading, isPreview } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {isPreview && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              🔍 <strong>Modo Preview:</strong> Esta es una demostración del planificador de menús. En producción, todas
              las funciones estarían completamente operativas.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús Semanales</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organiza tus comidas de la semana de manera sencilla y eficiente
          </p>
        </div>

        {!user ? (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <ChefHat className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Gestiona Recetas</CardTitle>
                  <CardDescription>
                    Crea y organiza tus recetas favoritas con ingredientes y pasos detallados
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Calendar className="h-8 w-8 text-green-600 mb-2" />
                  <CardTitle>Planifica Menús</CardTitle>
                  <CardDescription>Organiza tus comidas y cenas para toda la semana de forma visual</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <BookOpen className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Historial</CardTitle>
                  <CardDescription>
                    Revisa tus menús anteriores y reutiliza tus planificaciones favoritas
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="text-center">
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>¡Comienza ahora!</CardTitle>
                  <CardDescription>
                    {isPreview
                      ? "En modo preview - La autenticación está deshabilitada"
                      : "Inicia sesión o crea una cuenta para comenzar a planificar tus menús"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link href="/login">{isPreview ? "Ver Demo de Login" : "Iniciar Sesión"}</Link>
                    </Button>
                    {isPreview && (
                      <Button asChild variant="outline" className="w-full bg-transparent">
                        <Link href="/recipes">Ver Demo de Recetas</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido de vuelta!</h2>
              <p className="text-gray-600">¿Qué te gustaría hacer hoy?</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Menú Semanal</CardTitle>
                  <CardDescription>Planifica tus comidas para esta semana</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/weekly-menu">Ir al Menú</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <ChefHat className="h-8 w-8 text-green-600 mb-2" />
                  <CardTitle>Mis Recetas</CardTitle>
                  <CardDescription>Gestiona tu colección de recetas</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/recipes">Ver Recetas</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BookOpen className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Historial</CardTitle>
                  <CardDescription>Revisa tus menús anteriores</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/history">Ver Historial</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
