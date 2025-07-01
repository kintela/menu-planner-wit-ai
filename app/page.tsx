import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChefHat, Calendar, Search, Plus } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Planificador de Menús con IA</h1>
        <p className="text-xl text-gray-600 mb-8">
          Organiza tus recetas, planifica menús semanales y descubre nuevas ideas culinarias
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/recipes">
              <Search className="mr-2 h-5 w-5" />
              Ver Mis Recetas
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/weekly-menu">
              <Calendar className="mr-2 h-5 w-5" />
              Planificar Menú
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Mis Recetas
            </CardTitle>
            <CardDescription>Guarda y organiza todas tus recetas favoritas en un solo lugar</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/recipes">Ver Recetas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificador Semanal
            </CardTitle>
            <CardDescription>Organiza tus comidas de la semana y calcula calorías automáticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/weekly-menu">Planificar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Añadir Receta
            </CardTitle>
            <CardDescription>Crea nuevas recetas o genera ideas con inteligencia artificial</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/recipes/add">Añadir Receta</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-semibold mb-4">¿Listo para empezar?</h2>
        <p className="text-gray-600 mb-4">Comienza añadiendo tus primeras recetas y organizando tu menú semanal</p>
        <Button asChild>
          <Link href="/recipes/add">
            <Plus className="mr-2 h-4 w-4" />
            Añadir Primera Receta
          </Link>
        </Button>
      </div>
    </div>
  )
}
