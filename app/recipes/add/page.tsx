import { AddRecipeForm } from "@/components/add-recipe-form"
import { createServerClient } from "@/lib/supabase/server"

export default async function AddRecipePage() {
  console.log("Cargando página de añadir receta...")

  const supabase = createServerClient()

  // Obtener todas las categorías
  const { data: categories, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error al obtener categorías:", error)
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
