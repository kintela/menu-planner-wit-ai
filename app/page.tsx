import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleNavigation } from "@/components/simple-navigation"
import { ChefHat, Calendar } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <SimpleNavigation />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús con IA</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Organiza tus comidas semanales de forma inteligente con sugerencias personalizadas
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                Gestión de Recetas
              </CardTitle>
              <CardDescription>Administra tu colección personal de recetas y descubre nuevas opciones</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/recipes">
                <Button className="w-full">Ver Mis Recetas</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Planificación Semanal
              </CardTitle>
              <CardDescription>Organiza tus menús semanales y genera listas de compras automáticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/weekly-menu">
                <Button className="w-full">Planificar Menú</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
