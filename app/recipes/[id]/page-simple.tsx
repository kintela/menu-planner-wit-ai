// Página de respaldo simple para debug
import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function SimpleRecipePage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()

  let recipe:
    | {
        id: string
        title: string | null
        ingredients: any
        instructions: any
      }
    | null = null
  let fetchError: string | null = null

  try {
    const { data, error } = await supabase
      .from("recipes")
      .select("id, title, ingredients, instructions")
      .eq("id", params.id)
      .single()

    if (error) {
      fetchError = error.message ?? "No se pudo obtener la receta"
    } else {
      recipe = data
    }
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Error desconocido"
  }

  if (fetchError) {
    return (
      <div className="p-4">
        <h1>Error: {fetchError}</h1>
        <Link href="/recipes">Volver</Link>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="p-4">
        <h1>Receta no encontrada</h1>
        <Link href="/recipes">Volver</Link>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1>{recipe.title}</h1>
      <Link href="/recipes">Volver</Link>
      <div>
        <h2>Ingredientes:</h2>
        <pre>{JSON.stringify(recipe.ingredients, null, 2)}</pre>
      </div>
      <div>
        <h2>Instrucciones:</h2>
        <pre>{JSON.stringify(recipe.instructions, null, 2)}</pre>
      </div>
    </div>
  )
}
