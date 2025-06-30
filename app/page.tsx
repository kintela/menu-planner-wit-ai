import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChefHat, BookOpen, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Organiza tus comidas de la semana de manera sencilla y eficiente. Gestiona tus recetas favoritas y planifica
          menús balanceados.
        </p>
      </div>

      {/* Main Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-primary" />
              <CardTitle>Planificar Menús</CardTitle>
            </div>
            <CardDescription>Crea y organiza tus menús semanales de forma intuitiva</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Planifica comidas y cenas para toda la semana</li>
                <li>• Visualiza tu menú en formato calendario</li>
                <li>• Guarda y reutiliza tus menús favoritos</li>
                <li>• Genera listas de compras automáticamente</li>
              </ul>
              <Link href="/weekly-menu">
                <Button className="w-full">Comenzar a Planificar</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ChefHat className="h-6 w-6 text-primary" />
              <CardTitle>Gestionar Recetas</CardTitle>
            </div>
            <CardDescription>Administra tu colección personal de recetas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Añade tus recetas favoritas</li>
                <li>• Organiza por categorías y dificultad</li>
                <li>• Busca y filtra fácilmente</li>
                <li>• Comparte recetas con otros usuarios</li>
              </ul>
              <Link href="/recipes">
                <Button className="w-full bg-transparent" variant="outline">
                  Ver Mis Recetas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Categorías</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Organiza tus recetas por tipo de comida, origen o cualquier categoría personalizada.
            </p>
            <Link href="/categories">
              <Button variant="ghost" size="sm">
                Gestionar Categorías
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Sugerencias IA</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Obtén sugerencias inteligentes de menús basadas en tus preferencias y recetas.
            </p>
            <Button variant="ghost" size="sm" disabled>
              Próximamente
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Historial</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Revisa tus menús anteriores y reutiliza las combinaciones que más te gustaron.
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
