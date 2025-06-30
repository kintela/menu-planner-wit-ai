import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, ChefHat, Clock, Users, Utensils } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Organiza tus comidas de la semana de manera sencilla. Crea recetas, planifica menús y simplifica tu rutina
          culinaria.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg">
            <Link href="/weekly-menu">
              <Calendar className="mr-2 h-5 w-5" />
              Crear Menú Semanal
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/recipes">
              <BookOpen className="mr-2 h-5 w-5" />
              Ver Recetas
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Gestión de Recetas
            </CardTitle>
            <CardDescription>Crea, edita y organiza todas tus recetas favoritas en un solo lugar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="/recipes/add">Añadir Receta</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificación Semanal
            </CardTitle>
            <CardDescription>Planifica tus comidas y cenas para toda la semana de forma visual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="/weekly-menu">Ver Planificador</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Categorías
            </CardTitle>
            <CardDescription>Organiza tus recetas por categorías para encontrarlas fácilmente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="/categories">Ver Categorías</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="text-center p-4 bg-muted rounded-lg">
          <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">5 min</div>
          <div className="text-sm text-muted-foreground">Planificación rápida</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">∞</div>
          <div className="text-sm text-muted-foreground">Recetas ilimitadas</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">Familia</div>
          <div className="text-sm text-muted-foreground">Para toda la familia</div>
        </div>
        <div className="text-center p-4 bg-muted rounded-lg">
          <ChefHat className="h-8 w-8 mx-auto mb-2 text-primary" />
          <div className="text-2xl font-bold">Fácil</div>
          <div className="text-sm text-muted-foreground">Interfaz intuitiva</div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center bg-muted rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">¿Listo para empezar?</h2>
        <p className="text-muted-foreground mb-6">
          Comienza a planificar tus menús semanales y simplifica tu rutina culinaria.
        </p>
        <Button asChild size="lg">
          <Link href="/weekly-menu">Empezar Ahora</Link>
        </Button>
      </div>
    </div>
  )
}
