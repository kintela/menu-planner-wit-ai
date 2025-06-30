"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Calendar, BookOpen, Plus } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8 mx-auto"></div>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas y si no se
            te ocurre nada pídeselas a la IA.
          </p>
          <Link href="/login">
            <Button size="lg">Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas y si no se te
          ocurre nada pídeselas a la IA.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
              Planificar Menús
            </CardTitle>
            <CardDescription className="text-base">
              Crea y organiza tus menús semanales de forma intuitiva
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/weekly-menu">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3">Ir al Planificador</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <BookOpen className="h-6 w-6 text-green-600" />
              Gestionar Recetas
            </CardTitle>
            <CardDescription className="text-base">
              Explora, añade y organiza todas tus recetas favoritas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/recipes">
              <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3">Ver Recetas</Button>
            </Link>
            <Link href="/recipes/add">
              <Button variant="outline" className="w-full py-3 flex items-center justify-center gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Añadir Receta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
