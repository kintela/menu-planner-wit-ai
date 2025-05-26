"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ListChecks, User } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"

export default function HomeDashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="text-center">
        <h1 className="text-3xl font-semibold mb-2">
          {user ? `¡Hola, ${user.email?.split("@")[0]}!` : "Planificador de menús"}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          {user
            ? "Bienvenido de vuelta. Planifica tus comidas y cenas para toda la semana de manera sencilla."
            : "Planifica tus comidas y cenas para toda la semana de manera sencilla. Añade tus propias recetas y si no se te ocurre nada pídeselas a la IA."}
        </p>
      </div>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto">
        {/* Planificar Semana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Planificar Semana
            </CardTitle>
            <CardDescription>Organiza tu menú semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Crea un menú semanal detallado con tus recetas favoritas.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/weekly-menu">Planificar Ahora</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Mis Recetas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-2 h-5 w-5" />
              Mis Recetas
            </CardTitle>
            <CardDescription>Gestiona tus recetas personales</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Añade, edita o elimina tus recetas para personalizar tu menú.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/recipes">Gestionar Recetas</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {user && (
        <div className="mt-8 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <User className="mr-2 h-5 w-5" />
                Tu cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Conectado como: <span className="font-medium">{user.email}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
