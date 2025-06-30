import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ChefHat, Clock, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Organiza tus comidas de la semana de manera sencilla. Crea, guarda y comparte tus menús favoritos.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg">
            <Link href="/weekly-menu">
              <CalendarDays className="mr-2 h-5 w-5" />
              Crear Menú Semanal
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/recipes">
              <ChefHat className="mr-2 h-5 w-5" />
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
              <CalendarDays className="h-5 w-5 text-primary" />
              Planificación Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Organiza tus comidas y cenas para toda la semana. Visualiza tu menú de forma clara y ordenada.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              Gestión de Recetas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Añade, edita y organiza tus recetas favoritas. Incluye ingredientes, instrucciones y categorías.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ahorra Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Planifica con anticipación y reduce el tiempo dedicado a decidir qué cocinar cada día.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Para Toda la Familia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Crea menús que satisfagan a todos los miembros de tu familia con opciones variadas y equilibradas.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-6">Acciones Rápidas</h2>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild variant="outline">
            <Link href="/recipes/add">Añadir Receta</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/categories">Ver Categorías</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/history">Historial de Menús</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
