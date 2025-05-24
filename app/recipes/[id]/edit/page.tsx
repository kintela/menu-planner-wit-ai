import { createServerClient } from "@/lib/supabase/server"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import { notFound } from "next/navigation"

interface EditRecipePageProps {
  params: {
    id: string
  }
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const supabase = createServerClient()

  // Obtener la receta
  const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", params.id).single()

  if (error || !recipe) {
    notFound()
  }

  // Obtener las categorías de la receta
  const { data: recipeCategories } = await supabase
    .from("recipe_categories")
    .select("category_id")
    .eq("recipe_id", recipe.id)

  const selectedCategoryIds = recipeCategories?.map((rc) => rc.category_id) || []

  // Obtener todas las categorías
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // Imprimir información de depuración
  console.log("Recipe:", recipe)
  console.log("Selected Category IDs:", selectedCategoryIds)
  console.log("All Categories:", categories)

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Editar Receta</h1>
      <EditRecipeForm recipe={recipe} categories={categories || []} selectedCategoryIds={selectedCategoryIds} />
    </div>
  )
}
