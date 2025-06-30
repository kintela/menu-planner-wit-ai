import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ChefHat, Clock, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Planifica tus menús con <span className="text-primary">Inteligencia Artificial</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Organiza tus comidas semanales, gestiona tus recetas favoritas y descubre nuevos platos con sugerencias
          personalizadas de IA.
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Planificar Menús</CardTitle>
                <CardDescription className="text-base">Organiza tus comidas para toda la semana</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Crea menús semanales personalizados, asigna recetas a cada día y mantén una alimentación organizada y
              variada.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/weekly-menu" className="flex-1">
                <Button className="w-full" size="lg">
                  Ver Menú Semanal
                </Button>
              </Link>
              <Link href="/recipes" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent" size="lg">
                  Explorar Recetas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Gestionar Recetas</CardTitle>
                <CardDescription className="text-base">Crea, edita y organiza tus recetas favoritas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Guarda tus recetas favoritas, organízalas por categorías y descubre nuevas ideas con sugerencias de IA.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/recipes/add" className="flex-1">
                <Button className="w-full" size="lg">
                  Añadir Receta
                </Button>
              </Link>
              <Link href="/recipes" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent" size="lg">
                  Ver Todas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <Clock className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Ahorra Tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Planifica toda tu semana en minutos y evita la pregunta diaria de "¿qué cocinamos hoy?"
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <ChefHat className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Recetas Inteligentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Recibe sugerencias personalizadas basadas en tus preferencias y ingredientes disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Users className="h-8 w-8 mx-auto text-primary mb-2" />
            <CardTitle className="text-lg">Para Toda la Familia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Organiza menús que satisfagan a todos los miembros de tu familia con opciones variadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="text-center space-y-6 bg-muted/50 rounded-lg p-8">
        <h2 className="text-3xl font-bold">¿Listo para empezar?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Únete a miles de familias que ya han simplificado su planificación de comidas
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/weekly-menu">
            <Button size="lg" className="min-w-[200px]">
              Planificar mi Menú
            </Button>
          </Link>
          <Link href="/recipes">
            <Button variant="outline" size="lg" className="min-w-[200px] bg-transparent">
              Explorar Recetas
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
