import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Recipe {
  id: string
  created_at: string
  title: string
  ingredients: string[] | string
  instructions: string[] | string
  preparation: string
  image: string
  image_url: string
  user_id: string
}

async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    const supabase = createServerClient()

    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching recipe:", error)
      return null
    }

    return recipe
  } catch (error) {
    console.error("Unexpected error fetching recipe:", error)
    return null
  }
}

function ensureArray(value: string[] | string | null | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch (e) {
      return value.includes("\n") ? value.split("\n").filter(Boolean) : [value]
    }
  }
  return [String(value)]
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  const { id } = params

  // Validate the ID parameter
  if (!id || typeof id !== "string") {
    notFound()
  }

  const recipe = await getRecipe(id)

  // If recipe not found, show 404
  if (!recipe) {
    notFound()
  }

  // Safely process the recipe data
  const ingredientsArray = ensureArray(recipe.ingredients)
  const instructionsArray = recipe.instructions ? ensureArray(recipe.instructions) : ensureArray(recipe.preparation)

  // Handle image URL safely
  const imageUrl = recipe.image_url || recipe.image || null

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button asChild variant="outline">
          <Link href="/recipes" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a recetas</span>
          </Link>
        </Button>

        <h1 className="text-2xl sm:text-3xl font-bold text-center flex-1">{recipe.title}</h1>

        <Button asChild variant="outline">
          <Link href={`/recipes/${id}/edit`}>Editar receta</Link>
        </Button>
      </div>

      {/* Image section */}
      <div className="relative w-full h-64 sm:h-96 mb-6">
        {imageUrl ? (
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={recipe.title || "Imagen de receta"}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.onerror = null
              target.src = "/placeholder.svg?height=400&width=600&text=Sin+imagen"
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
            <span className="text-gray-400">Sin imagen disponible</span>
          </div>
        )}
      </div>

      {/* Content grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Ingredientes:</h2>
          {ingredientsArray.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {ingredientsArray.map((ingredient, index) => (
                <li key={index} className="text-foreground">
                  {ingredient}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">No hay ingredientes disponibles</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Instrucciones:</h2>
          {instructionsArray.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-4">
              {instructionsArray.map((instruction, index) => (
                <li key={index} className="text-foreground">
                  {instruction}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground italic">No hay instrucciones disponibles</p>
          )}
        </div>
      </div>
    </div>
  )
}
