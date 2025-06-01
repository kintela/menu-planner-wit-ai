import { createServerClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
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
    // Validar que el ID sea un número válido
    const numericId = Number.parseInt(id, 10)
    if (isNaN(numericId) || numericId <= 0) {
      console.error("ID de receta inválido:", id)
      return null
    }

    const supabase = createServerClient()

    // Usar timeout para evitar cuelgues en móvil
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 10000)
    })

    const queryPromise = supabase.from("recipes").select("*").eq("id", id).single()

    const { data: recipe, error } = await Promise.race([queryPromise, timeoutPromise])

    if (error) {
      console.error("Error al obtener receta:", error.message)
      return null
    }

    if (!recipe) {
      console.error("Receta no encontrada para ID:", id)
      return null
    }

    return recipe
  } catch (error) {
    console.error("Error inesperado al obtener receta:", error)
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
  try {
    const { id } = params

    // Validación más estricta del parámetro ID
    if (!id || typeof id !== "string" || id.trim() === "") {
      console.error("Parámetro ID inválido:", id)
      notFound()
    }

    const recipe = await getRecipe(id)

    // Si no se encuentra la receta, mostrar 404
    if (!recipe) {
      console.error("Receta no encontrada, mostrando 404 para ID:", id)
      notFound()
    }

    // Procesar datos de la receta de forma segura
    const ingredientsArray = ensureArray(recipe.ingredients)
    const instructionsArray = recipe.instructions ? ensureArray(recipe.instructions) : ensureArray(recipe.preparation)

    // Manejar URL de imagen de forma segura
    const imageUrl = recipe.image_url || recipe.image || null

    return (
      <div className="container mx-auto py-4 sm:py-8 px-4">
        <div className="mb-6 flex flex-col gap-4">
          {/* Navegación superior */}
          <div className="flex justify-between items-center">
            <Button asChild variant="outline" size="sm">
              <Link href="/recipes" className="flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver a recetas</span>
                <span className="sm:hidden">Volver</span>
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm">
              <Link href={`/recipes/${id}/edit`}>
                <span className="hidden sm:inline">Editar receta</span>
                <span className="sm:hidden">Editar</span>
              </Link>
            </Button>
          </div>

          {/* Título */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center">
            {recipe.title || "Receta sin título"}
          </h1>
        </div>

        {/* Sección de imagen */}
        <div className="relative w-full h-48 sm:h-64 md:h-96 mb-6">
          {imageUrl ? (
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={recipe.title || "Imagen de receta"}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = "/placeholder.svg?height=400&width=600&text=Sin+imagen"
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
              <span className="text-muted-foreground">Sin imagen disponible</span>
            </div>
          )}
        </div>

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Ingredientes */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Ingredientes:</h2>
            {ingredientsArray.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2">
                {ingredientsArray.map((ingredient, index) => (
                  <li key={index} className="text-foreground text-sm sm:text-base">
                    {ingredient}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground italic text-sm sm:text-base">No hay ingredientes disponibles</p>
            )}
          </div>

          {/* Instrucciones */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Instrucciones:</h2>
            {instructionsArray.length > 0 ? (
              <ol className="list-decimal pl-5 space-y-3 sm:space-y-4">
                {instructionsArray.map((instruction, index) => (
                  <li key={index} className="text-foreground text-sm sm:text-base">
                    {instruction}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground italic text-sm sm:text-base">No hay instrucciones disponibles</p>
            )}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error crítico en RecipePage:", error)
    // En caso de error crítico, redirigir a la lista de recetas
    redirect("/recipes")
  }
}

// Generar metadata de forma segura
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    const recipe = await getRecipe(params.id)
    return {
      title: recipe?.title || "Receta",
      description: `Receta: ${recipe?.title || "Ver detalles de la receta"}`,
    }
  } catch (error) {
    return {
      title: "Receta",
      description: "Ver detalles de la receta",
    }
  }
}
