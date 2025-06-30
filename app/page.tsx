"use client"

import { CalendarDays, ChefHat, PlusCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">Planificador de Menús Semanales</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organiza tus comidas, gestiona tus recetas y simplifica tu vida culinaria con nuestra herramienta
            inteligente
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-8 w-8 text-orange-600" />
                <CardTitle className="text-2xl">Planificar Menús</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Crea menús semanales personalizados y organiza tus comidas de manera eficiente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" size="lg">
                <Link href="/weekly-menu">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Ir al Planificador
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8 text-red-600" />
                <CardTitle className="text-2xl">Gestionar Recetas</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Explora, crea y organiza tu colección personal de recetas favoritas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-transparent" variant="outline" size="lg">
                <Link href="/recipes">
                  <ChefHat className="mr-2 h-5 w-5" />
                  Ver Recetas
                </Link>
              </Button>
              <Button asChild className="w-full" size="lg">
                <Link href="/recipes/add">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Receta
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
