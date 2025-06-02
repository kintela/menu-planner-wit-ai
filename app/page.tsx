import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChefHat, Calendar, Users, Sparkles } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Planificador de Menús con IA</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Organiza tus comidas semanales de manera inteligente con la ayuda de la inteligencia artificial
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Recetas Inteligentes
            </CardTitle>
            <CardDescription>Descubre nuevas recetas personalizadas según tus preferencias</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/recipes">
              <Button className="w-full">Ver Recetas</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planificación Semanal
            </CardTitle>
            <CardDescription>Organiza tus menús para toda la semana de forma automática</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/weekly-menu">
              <Button className="w-full">Planificar Menú</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestión de Perfil
            </CardTitle>
            <CardDescription>Personaliza tu experiencia y preferencias alimentarias</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile">
              <Button className="w-full">Mi Perfil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              ¿Listo para empezar?
            </CardTitle>
            <CardDescription>Comienza a planificar tus menús de manera inteligente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 justify-center">
              <Link href="/login">
                <Button>Iniciar Sesión</Button>
              </Link>
              <Link href="/recipes/new">
                <Button variant="outline">Añadir Receta</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
