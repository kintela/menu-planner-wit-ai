import Link from "next/link"
import { Calendar, ChefHat, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleNavigation } from "@/components/simple-navigation"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleNavigation />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <ChefHat className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">Planificador de Menús con IA</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organiza tus comidas semanales y gestiona tus recetas favoritas de forma inteligente
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Planificar Menús */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle className="text-xl">Planificar Menús</CardTitle>
                  <CardDescription>Crea y organiza tus menús semanales con facilidad</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Planifica tus comidas para toda la semana, organiza por días y tipos de comida.
              </p>
              <Button asChild className="w-full">
                <Link href="/weekly-menu">Ir al Planificador</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Gestionar Recetas */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <ChefHat className="h-8 w-8 text-green-600" />
                <div>
                  <CardTitle className="text-xl">Gestionar Recetas</CardTitle>
                  <CardDescription>Administra tu colección personal de recetas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Añade, edita y organiza todas tus recetas favoritas en un solo lugar.
              </p>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href="/recipes">Ver Recetas</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI Features */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
            <Sparkles className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Potenciado por Inteligencia Artificial</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Genera recetas automáticamente, obtén sugerencias personalizadas y optimiza tu planificación nutricional
              con la ayuda de IA.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
