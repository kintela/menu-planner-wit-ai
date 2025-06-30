import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ChefHat, Utensils, BookOpen } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús con IA</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Organiza tus comidas semanales, gestiona tus recetas favoritas y descubre nuevas ideas culinarias con la ayuda
          de inteligencia artificial.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span>Planificar Menús</span>
            </CardTitle>
            <CardDescription>Crea y organiza tus menús semanales de forma inteligente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Planifica tus comidas y cenas para toda la semana. Organiza tus recetas por días y mantén una alimentación
              balanceada y variada.
            </p>
            <Link href="/weekly-menu">
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Ir al Planificador
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-green-600" />
              <span>Gestionar Recetas</span>
            </CardTitle>
            <CardDescription>Administra tu colección personal de recetas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Guarda, organiza y busca tus recetas favoritas. Añade ingredientes, instrucciones y categoriza por tipo de
              comida.
            </p>
            <Link href="/recipes">
              <Button className="w-full bg-transparent" variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Ver Recetas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <ChefHat className="h-5 w-5" />
              <span>Categorías</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Organiza tus recetas por categorías para encontrarlas fácilmente.
            </p>
            <Link href="/categories">
              <Button variant="ghost" size="sm">
                Ver Categorías
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Utensils className="h-5 w-5" />
              <span>Sugerencias IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Obtén sugerencias inteligentes para tus menús basadas en tus preferencias.
            </p>
            <Button variant="ghost" size="sm" disabled>
              Próximamente
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Calendar className="h-5 w-5" />
              <span>Historial</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Revisa tus menús anteriores y reutiliza tus planificaciones favoritas.
            </p>
            <Link href="/history">
              <Button variant="ghost" size="sm">
                Ver Historial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
