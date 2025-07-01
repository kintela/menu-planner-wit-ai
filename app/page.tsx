import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ChefHat } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">MenuPlanner</span>
            </div>
            <nav className="flex space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Inicio
              </Link>
              <Link
                href="/recipes"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Recetas
              </Link>
              <Link
                href="/weekly-menu"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Planificar
              </Link>
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Añadir
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">Planificador de Menús con IA</h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Organiza tus comidas semanales y gestiona tus recetas favoritas de forma inteligente
          </p>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {/* Planificar Menús Card */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <CardTitle className="ml-3 text-xl">Planificar Menús</CardTitle>
              </div>
              <CardDescription>Crea y organiza tus menús semanales con facilidad</CardDescription>
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

          {/* Gestionar Recetas Card */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center">
                <ChefHat className="h-8 w-8 text-green-600" />
                <CardTitle className="ml-3 text-xl">Gestionar Recetas</CardTitle>
              </div>
              <CardDescription>Administra tu colección personal de recetas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Añade, edita y organiza todas tus recetas favoritas en un solo lugar.
              </p>
              <Button asChild className="w-full">
                <Link href="/recipes">Ver Recetas</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
