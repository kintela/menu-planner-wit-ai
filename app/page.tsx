"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ChefHat } from "lucide-react"
import Link from "next/link"
import { SimpleNavigation } from "@/components/simple-navigation"

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús con IA</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organiza tus comidas semanales y gestiona tus recetas favoritas de forma inteligente
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-600" />
                Planificar Menús
              </CardTitle>
              <CardDescription>Crea y organiza tus menús semanales con facilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Planifica tus comidas para toda la semana, organiza por días y tipos de comida.
              </p>
              <Link href="/weekly-menu">
                <Button className="w-full">Ir al Planificador</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-green-600" />
                Gestionar Recetas
              </CardTitle>
              <CardDescription>Administra tu colección personal de recetas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Añade, edita y organiza todas tus recetas favoritas en un solo lugar.
              </p>
              <Link href="/recipes">
                <Button className="w-full bg-transparent" variant="outline">
                  Ver Recetas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
