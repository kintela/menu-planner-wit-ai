"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { SimpleNavigation } from "@/components/simple-navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, ChefHat, Users } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user } = useAuth()

  const features = [
    {
      icon: BookOpen,
      title: "Gestión de Recetas",
      description: "Organiza y guarda todas tus recetas favoritas en un solo lugar",
      href: "/recipes",
    },
    {
      icon: Calendar,
      title: "Planificación Semanal",
      description: "Planifica tus menús semanales de forma fácil e intuitiva",
      href: "/weekly-menu",
    },
    {
      icon: ChefHat,
      title: "Sugerencias con IA",
      description: "Obtén sugerencias de recetas personalizadas con inteligencia artificial",
      href: "/recipes/search",
    },
    {
      icon: Users,
      title: "Comunidad",
      description: "Comparte recetas y descubre nuevas ideas culinarias",
      href: "/recipes",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <SimpleNavigation />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Planifica tus menús con{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
              inteligencia artificial
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Organiza tus recetas, planifica menús semanales y obtén sugerencias personalizadas para hacer de la cocina
            una experiencia más fácil y divertida.
          </p>

          {user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/weekly-menu">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Planificar Menú
                </Button>
              </Link>
              <Link href="/recipes">
                <Button size="lg" variant="outline">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Ver Recetas
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  Comenzar Gratis
                </Button>
              </Link>
              <Link href="/recipes">
                <Button size="lg" variant="outline">
                  Explorar Recetas
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <feature.icon className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 mb-4">{feature.description}</CardDescription>
                <Link href={feature.href}>
                  <Button variant="ghost" className="text-orange-600 hover:text-orange-700 p-0">
                    Explorar →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para revolucionar tu cocina?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Únete a miles de usuarios que ya están organizando sus menús de forma inteligente y ahorrando tiempo en la
            cocina.
          </p>
          {!user && (
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                Empezar Ahora - Es Gratis
              </Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
