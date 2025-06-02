"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function HomePage() {
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    const errorCode = searchParams.get("error_code")
    const errorDescription = searchParams.get("error_description")

    if (error) {
      setShowError(true)

      if (errorCode === "otp_expired") {
        setErrorMessage("El enlace de recuperación de contraseña ha expirado. Por favor, solicita uno nuevo.")
      } else if (error === "access_denied") {
        setErrorMessage("Acceso denegado. El enlace puede ser inválido o haber expirado.")
      } else {
        setErrorMessage(errorDescription || "Ha ocurrido un error durante la autenticación.")
      }
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Mostrar error si existe */}
        {showError && (
          <div className="max-w-md mx-auto mb-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3">
                <span>{errorMessage}</span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Solicitar nuevo enlace
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Navegación */}
        <nav className="flex justify-between items-center mb-12">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🍽️</span>
              </div>
              <span className="font-semibold text-gray-900">Menu Planner</span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link href="/recipes" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <span>📖</span>
                <span>Recetas</span>
              </Link>
              <Link href="/weekly-menu" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <span>📅</span>
                <span>Menú Semanal</span>
              </Link>
            </div>
          </div>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </nav>

        {/* Contenido principal */}
        <div className="text-center mb-16">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-400 rounded-full mx-auto mb-8 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Planificador de Menús Semanales</h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Planifica tus comidas y cenas para toda la semana de manera sencilla.
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Añade tus propias recetas y si no se te ocurre nada pídeselas a la IA.
          </p>
        </div>

        {/* Tarjetas de funcionalidades */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Planificar Menús</h3>
            </div>
            <p className="text-gray-600 mb-6">Crea y organiza tus menús semanales de forma intuitiva</p>
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link href="/weekly-menu">Ir al Planificador</Link>
            </Button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">🍳</span>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900">Gestionar Recetas</h3>
            </div>
            <p className="text-gray-600 mb-6">Explora, añade y organiza todas tus recetas favoritas</p>
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full">
                <Link href="/recipes">Ver Recetas</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/recipes/add">
                  <span className="mr-2">➕</span>
                  Añadir Receta
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
