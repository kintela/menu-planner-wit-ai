"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { LoginForm } from "@/components/auth/login-form"
import { AddRecipeForm } from "@/components/add-recipe-form"
import { Loader2 } from "lucide-react"

export default function AddRecipePage() {
  const { user, loading } = useAuth()

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar el formulario de login
  if (!user) {
    return <LoginForm />
  }

  // Si está autenticado, mostrar el formulario de añadir recetas
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Añadir Nueva Receta</h1>
        <AddRecipeForm />
      </div>
    </div>
  )
}
