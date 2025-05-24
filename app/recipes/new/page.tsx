import { redirect } from "next/navigation"
import { AddRecipeForm } from "@/components/add-recipe-form"
import { createServerClient } from "@/lib/supabase/server"

export default async function NewRecipePage() {
  redirect("/recipes/add")

  const supabase = createServerClient()

  // Obtener todas las categorías
  const { data: categories, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error al obtener categorías:", error)
  }

  console.log("Categorías obtenidas:", categories?.length || 0)

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Añadir Nueva Receta</h1>
      <AddRecipeForm categories={categories || []} />
    </div>
  )
}
