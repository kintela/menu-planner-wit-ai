// Página de respaldo simple para debug. Usa la misma proyección pública que la ruta real.
import Link from "next/link"
import { cookies } from "next/headers"
import { readPublicRecipe } from "@/lib/recipes/recipe-server-operations"
import { createClient } from "@/lib/supabase/server"

export default async function SimpleRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await readPublicRecipe(createClient(await cookies()), id)
  const recipe = result.status === 200 && "recipe" in result.body ? result.body.recipe : null

  if (!recipe) {
    return <div className="p-4"><h1>Receta no encontrada</h1><Link href="/recipes">Volver</Link></div>
  }

  return (
    <div className="p-4">
      <h1>{recipe.name}</h1>
      <Link href="/recipes">Volver</Link>
      <h2>Ingredientes:</h2><pre>{recipe.ingredients}</pre>
      <h2>Preparación:</h2><pre>{recipe.preparation}</pre>
    </div>
  )
}
