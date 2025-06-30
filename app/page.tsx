"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ChefHat, PlusCircle } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bienvenido a Menu Planner AI</CardTitle>
            <CardDescription>Inicia sesión para acceder a tu planificador de menús</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/login">Crear Cuenta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús Semanales</h1>
          <p className="text-xl text-gray-600">
            Organiza tus comidas de la semana y gestiona tus recetas favoritas con inteligencia artificial
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <CalendarDays className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-xl">Planificar Menús</CardTitle>
                  <CardDescription>Crea y organiza tus menús semanales</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Planifica tus comidas para toda la semana, organiza por días y tipos de comida, y genera listas de
                compras automáticamente.
              </p>
              <Button asChild className="w-full">
                <Link href="/weekly-menu">Ir al Planificador</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <ChefHat className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle className="text-xl">Gestionar Recetas</CardTitle>
                  <CardDescription>Administra tu colección de recetas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Guarda, organiza y busca tus recetas favoritas. Añade nuevas recetas manualmente o con ayuda de IA.
              </p>
              <div className="flex space-x-2">
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href="/recipes">Ver Recetas</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/recipes/add">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Añadir Receta
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
