"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { SimpleNavigation } from "@/components/simple-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, ChefHat, Users } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen">
        <SimpleNavigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Planifica tus menús semanales</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Organiza tus comidas, guarda tus recetas favoritas y simplifica tu cocina
          </p>
          {user ? (
            <div className="space-x-4">
              <Link href="/weekly-menu">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  Ver Mi Menú Semanal
                </Button>
              </Link>
              <Link href="/recipes">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 bg-transparent"
                >
                  Mis Recetas
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Comenzar Ahora
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para planificar tus menús</h2>
            <p className="text-xl text-gray-600">Herramientas simples y potentes para organizar tu cocina</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Calendar className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Planificación Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Organiza tus comidas y cenas para toda la semana de forma visual e intuitiva
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Gestión de Recetas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Guarda, organiza y busca tus recetas favoritas en un solo lugar</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <ChefHat className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Sugerencias IA</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Recibe sugerencias personalizadas de recetas basadas en tus preferencias
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Compartir</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Comparte tus recetas y menús favoritos con familia y amigos</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="bg-blue-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Listo para empezar?</h2>
            <p className="text-xl mb-8 opacity-90">Únete a miles de usuarios que ya organizan sus menús con nosotros</p>
            <Link href="/login">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Crear Cuenta Gratis
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
