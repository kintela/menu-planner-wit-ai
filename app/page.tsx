import Link from "next/link"
import { CalendarDays, ChefHat, PlusCircle, AlertTriangle, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container py-10">
      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Planificador de Menús Semanales</h1>
        <p className="text-muted-foreground mt-4 max-w-3xl">
          Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas o utiliza
          sugerencias generadas por IA.
        </p>
      </div>

      {/* Alerta de configuración actualizada */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />🚨 Problema de Caché de Vercel Confirmado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 dark:text-red-300 mb-4">
            <strong>El Preview está usando valores placeholder</strong> en lugar de las variables reales. Error
            detectado:
          </p>
          <div className="bg-red-100 dark:bg-red-900 p-2 rounded font-mono text-sm mb-4">
            NEXT_PUBLIC_SUPABASE_URL contains placeholder value: "tu_url_de_supabase_aqui"
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/fix-vercel-cache">
                <Wrench className="mr-2 h-4 w-4" />
                Solucionar Ahora
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/debug">Verificar Estado</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <Wrench className="mr-2 h-5 w-5" />
              Solucionar Caché
            </CardTitle>
            <CardDescription>Arreglar problema de variables en Preview</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Guía paso a paso para forzar que Vercel use las variables correctas.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/fix-vercel-cache">Solucionar</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
