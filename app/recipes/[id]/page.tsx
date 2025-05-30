// app/recipes/[id]/page.tsx
import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"


interface Recipe {
  id: string
  created_at: string
  title: string

  ingredients: string[] | string
  instructions: string[] | string
  image: string
  user_id: string

}

async function getRecipe(id: string): Promise<Recipe> {
  try {
    const supabase = createServerClient()


    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error || !recipe) {
      return notFound()
    }

    return recipe
  } catch (error) {
    console.error("Error fetching recipe:", error)
    notFound()
  }
}

// Función auxiliar para convertir ingredientes e instrucciones a array
function ensureArray(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      // Intenta parsear como JSON si es un string
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch (e) {
      // Si no es JSON válido, divide por líneas o devuelve como un solo elemento
      return value.includes("\n") ? value.split("\n").filter(Boolean) : [value]
    }
  }
  return [String(value)]
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  const { id } = params
  const recipe = await getRecipe(id)

  // Asegurarse de que ingredients e instructions sean arrays
  const ingredientsArray = ensureArray(recipe?.ingredients)
  const instructionsArray = ensureArray(recipe?.instructions)

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">{recipe?.title}</h1>
        <Button asChild variant="outline">
          <Link href={`/recipes/${id}/edit`}>Editar receta</Link>
        </Button>
      </div>

      <img
        src={recipe?.image || "/placeholder.svg"}
        alt={recipe?.title}
        className="w-full max-h-96 object-cover rounded-lg mb-6"
      />

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Ingredientes:</h2>
          <ul className="list-disc pl-5 space-y-2">
            {ingredientsArray.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Instrucciones:</h2>
          <ol className="list-decimal pl-5 space-y-4">
            {instructionsArray.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
        </div>
      </div>

    </div>
  )
}
