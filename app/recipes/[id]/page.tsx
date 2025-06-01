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
    console.log("🔍 DEBUG - getRecipe iniciado para ID:", id)

    // Validar que el ID sea un número válido
    const numericId = Number.parseInt(id, 10)
    if (isNaN(numericId) || numericId <= 0) {
      console.error("❌ ID de receta inválido:", id)
      return null
    }

    console.log("✅ ID validado correctamente:", numericId)

    const supabase = createServerClient()
    console.log("✅ Cliente Supabase creado")

    // Consulta más simple y robusta
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    console.log("🔍 Resultado consulta:", {
      hasData: !!recipe,
      hasError: !!error,
      errorMessage: error?.message,
      recipeTitle: recipe?.title,
    })

    if (error) {
      console.error("❌ Error Supabase:", error)
      return null
    }

    return recipe
  } catch (error) {
    console.error("❌ Error crítico en getRecipe:", error)
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
  console.log("🔍 DEBUG - RecipePage iniciado con ID:", params.id)

  try {
    const { id } = params

    if (!id || typeof id !== "string" || id.trim() === "") {
      console.error("❌ ID inválido:", id)
      notFound()
    }

    const recipe = await getRecipe(id)

    if (!recipe) {
      console.error("❌ Receta no encontrada para ID:", id)

      // En lugar de notFound(), mostrar una página de error amigable
      return (
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Receta no encontrada</h1>
          <p className="text-muted-foreground mb-6">Lo sentimos, no pudimos encontrar la receta que buscas.</p>
          <div className="space-x-4">
            <Button asChild>
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Ir al inicio</Link>
            </Button>
          </div>
        </div>
      )
    }

    console.log("✅ Receta encontrada:", recipe.title)

    // Procesar datos de forma segura
    const ingredientsArray = ensureArray(recipe.ingredients)
    const instructionsArray = recipe.instructions ? ensureArray(recipe.instructions) : ensureArray(recipe.preparation)

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
    console.error("❌ Error crítico en RecipePage:", error)

    // Página de error amigable en lugar de crash
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Error al cargar la receta</h1>
        <p className="text-muted-foreground mb-6">Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.</p>
        <div className="space-x-4">
          <Button asChild>
            <Link href="/recipes">Ver todas las recetas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    )
  }
}

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
