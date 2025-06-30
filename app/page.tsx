import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ChefHat, PlusCircle } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Planificador de Menús Semanales</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas y si no se te
          ocurre nada pídeselas a la IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              Planificar Menús
            </CardTitle>
            <CardDescription>Crea y organiza tus menús semanales de forma intuitiva</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/weekly-menu">Ir al Planificador</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-green-600" />
              Gestionar Recetas
            </CardTitle>
            <CardDescription>Explora, añade y organiza todas tus recetas favoritas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="default" className="w-full">
              <Link href="/recipes">Ver Recetas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/recipes/add">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Receta
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
