import { CalendarDays, ChefHat, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Organiza tus comidas de la semana de manera fácil y eficiente. Crea menús personalizados y gestiona tus
          recetas favoritas.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-blue-600" />
              Planificar Menús
            </CardTitle>
            <CardDescription>Crea y organiza tus menús semanales con facilidad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Planifica tus comidas para toda la semana, organiza tus recetas y nunca más te quedes sin ideas para
              cocinar.
            </p>
            <Button asChild className="w-full">
              <Link href="/weekly-menu">Ir al Planificador</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-green-600" />
              Gestionar Recetas
            </CardTitle>
            <CardDescription>Administra tu colección de recetas favoritas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Guarda, organiza y descubre nuevas recetas. Mantén todas tus recetas favoritas en un solo lugar.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/recipes">Ver Recetas</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/recipes/add">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Añadir Receta
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
