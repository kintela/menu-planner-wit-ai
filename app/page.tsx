"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Calendar, BookOpen, ChefHat, Users } from "lucide-react"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Organiza tus comidas de la semana de manera sencilla y eficiente. Crea recetas, planifica menús y mantén una
          alimentación balanceada.
        </p>
      </div>

      {!user ? (
        <div className="text-center mb-12">
          <Link href="/login">
            <Button size="lg" className="mr-4">
              Iniciar Sesión
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">Inicia sesión para comenzar a planificar tus menús</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Menú Semanal
              </CardTitle>
              <CardDescription>Planifica tus comidas y cenas para toda la semana</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/weekly-menu">
                <Button className="w-full">Ver Menú</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Mis Recetas
              </CardTitle>
              <CardDescription>Gestiona tu colección personal de recetas</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/recipes">
                <Button className="w-full">Ver Recetas</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Nueva Receta
              </CardTitle>
              <CardDescription>Añade una nueva receta a tu colección</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/recipes/add">
                <Button className="w-full">Crear Receta</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="text-center">
          <div className="bg-primary/10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Planificación Semanal</h3>
          <p className="text-sm text-muted-foreground">Organiza tus comidas por días de la semana</p>
        </div>

        <div className="text-center">
          <div className="bg-primary/10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Gestión de Recetas</h3>
          <p className="text-sm text-muted-foreground">Crea y organiza tus recetas favoritas</p>
        </div>

        <div className="text-center">
          <div className="bg-primary/10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <ChefHat className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Sugerencias IA</h3>
          <p className="text-sm text-muted-foreground">Obtén sugerencias inteligentes de recetas</p>
        </div>

        <div className="text-center">
          <div className="bg-primary/10 rounded-full p-3 w-12 h-12 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Compartir</h3>
          <p className="text-sm text-muted-foreground">Comparte tus recetas con otros usuarios</p>
        </div>
      </div>
    </div>
  )
}
