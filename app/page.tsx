import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChefHat, Clock, Users, Sparkles, BookOpen } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Planificación Inteligente
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Planifica tus menús
            <span className="text-orange-600"> semanales</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organiza tus comidas de la semana de forma sencilla. Guarda recetas, genera menús automáticamente y nunca
            más te quedes sin ideas para cocinar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/weekly-menu">
                <Calendar className="mr-2 h-5 w-5" />
                Crear Menú Semanal
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-transparent">
              <Link href="/recipes">
                <BookOpen className="mr-2 h-5 w-5" />
                Ver Recetas
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Todo lo que necesitas para planificar</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Herramientas diseñadas para hacer la planificación de menús más fácil y eficiente
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle>Planificación Semanal</CardTitle>
              <CardDescription>
                Organiza tus comidas y cenas para toda la semana de forma visual e intuitiva
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <ChefHat className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Gestión de Recetas</CardTitle>
              <CardDescription>
                Guarda, organiza y categoriza todas tus recetas favoritas en un solo lugar
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Generación Automática</CardTitle>
              <CardDescription>Genera menús semanales automáticamente basados en tus recetas guardadas</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Ahorra Tiempo</CardTitle>
              <CardDescription>Reduce el tiempo dedicado a pensar qué cocinar cada día</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Para Toda la Familia</CardTitle>
              <CardDescription>Planifica menús considerando las preferencias de todos en casa</CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle>Historial de Menús</CardTitle>
              <CardDescription>Accede a menús anteriores y reutiliza tus planificaciones favoritas</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 border-0 text-white">
          <CardContent className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
            <p className="text-xl mb-8 opacity-90">Comienza a planificar tus menús semanales hoy mismo</p>
            <Button asChild size="lg" variant="secondary" className="text-lg px-8">
              <Link href="/login">Comenzar Ahora</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
