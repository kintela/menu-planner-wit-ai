import { redirect } from "next/navigation"
import { AddRecipeForm } from "@/components/add-recipe-form"
import { createServerClient } from "@/lib/supabase/server"

export default async function AddRecipePage() {
  console.log("🔍 Verificando autenticación en página de añadir receta...")

  const supabase = createServerClient()

  // Verificar si el usuario está autenticado
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  console.log("👤 Usuario en add recipe:", user ? user.email : "No autenticado")

  // Si no hay usuario autenticado, redirigir a login
  if (!user) {
    console.log("🚫 Usuario no autenticado - Redirigiendo a login")
    redirect("/login?redirect=/recipes/add")
  }

  // Obtener todas las categorías
  const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

  if (categoriesError) {
    console.error("Error al obtener categorías:", categoriesError)
  }

  // Generar un timestamp único para forzar el remontaje del componente
  const timestamp = Date.now()

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Añadir Nueva Receta</h1>
      <AddRecipeForm key={`add-recipe-form-${timestamp}`} categories={categories || []} />
    </div>
  )
}
