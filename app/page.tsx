import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, Calendar, BookOpen, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-full">
              <ChefHat className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Planificador de Menús
            <span className="block text-blue-600">con IA</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organiza tus comidas semanales, gestiona tus recetas favoritas y descubre nuevos platos con la ayuda de
            inteligencia artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/weekly-menu">
                <Calendar className="mr-2 h-5 w-5" />
                Planificar Menú
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3 bg-transparent">
              <Link href="/recipes">
                <BookOpen className="mr-2 h-5 w-5" />
                Ver Recetas
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Planificación Semanal</CardTitle>
              <CardDescription>
                Organiza tus comidas para toda la semana con nuestro planificador visual e intuitivo.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
                <BookOpen className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>Gestión de Recetas</CardTitle>
              <CardDescription>
                Guarda, organiza y busca tus recetas favoritas con categorías y filtros inteligentes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Sugerencias con IA</CardTitle>
              <CardDescription>
                Descubre nuevas recetas y obtén sugerencias personalizadas basadas en tus preferencias.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Listo para empezar?</h2>
          <p className="text-gray-600 mb-6">
            Comienza a planificar tus menús semanales y descubre lo fácil que puede ser comer bien.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link href="/recipes/add">
              <ChefHat className="mr-2 h-5 w-5" />
              Añadir Primera Receta
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
