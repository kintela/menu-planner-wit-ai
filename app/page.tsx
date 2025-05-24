import Link from "next/link"
import { CalendarDays, ChefHat, PlusCircle, Settings, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Planificador de Menús Semanales</h1>
        <p className="text-muted-foreground mt-4 max-w-3xl">
          Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas y organiza tu
          menú semanal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5" />
              Menú Semanal
            </CardTitle>
            <CardDescription>Visualiza y planifica tu menú semanal actual</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Organiza tus comidas y cenas para cada día de la semana.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/weekly-menu">Ver Menú Semanal</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChefHat className="mr-2 h-5 w-5" />
              Recetas
            </CardTitle>
            <CardDescription>Explora tu colección de recetas</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Busca recetas por categoría o ingredientes para añadirlas a tu menú.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/recipes">Ver Recetas</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PlusCircle className="mr-2 h-5 w-5" />
              Añadir Receta
            </CardTitle>
            <CardDescription>Añade nuevas recetas a tu colección</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Crea tus propias recetas con ingredientes, preparación e imágenes.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/recipes/add">Añadir Receta</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Categorías
            </CardTitle>
            <CardDescription>Gestiona las categorías de tus recetas</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Organiza tus recetas por categorías para encontrarlas fácilmente.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/categories">Gestionar Categorías</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Historial
            </CardTitle>
            <CardDescription>Revisa tus menús anteriores</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Consulta los menús semanales que has guardado anteriormente.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/history">Ver Historial</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
