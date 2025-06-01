import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Recipe {
  id: string
  created_at: string
  name: string
  ingredients: string[] | string
  preparation: string
  image_url: string
  is_ai_generated: boolean
  video_url: string | null
  source_url: string | null
  calories: number | null
  user_id?: string
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

    // Consulta con los nombres correctos de columnas
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    console.log("🔍 Resultado consulta:", {
      hasData: !!recipe,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      recipeName: recipe?.name,
    })

    if (error) {
      // Si el error es "PGRST116", significa que no se encontró la receta
      if (error.code === "PGRST116") {
        console.log("ℹ️ Receta no encontrada (ID no existe):", id)
        return null
      }
      console.error("❌ Error Supabase:", error)
      return null
    }

    if (!recipe) {
      console.log("ℹ️ Receta no encontrada (sin datos):", id)
      return null
    }

    console.log("✅ Receta encontrada:", recipe.name)
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
      return (
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">ID de receta inválido</h1>
          <p className="text-muted-foreground mb-6">El ID de la receta no es válido.</p>
          <Button asChild>
            <Link href="/recipes">Ver todas las recetas</Link>
          </Button>
        </div>
      )
    }

    console.log("🔍 Llamando a getRecipe para ID:", id)
    const recipe = await getRecipe(id)

    if (!recipe) {
      console.log("❌ Receta no encontrada para ID:", id)

      // Mostrar página de error amigable en lugar de notFound()
      return (
        <div className="container mx-auto py-8 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Receta no encontrada</h1>
          <p className="text-muted-foreground mb-6">
            Lo sentimos, la receta con ID {id} no existe o ha sido eliminada.
          </p>
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

    console.log("✅ Receta encontrada, renderizando:", recipe.name)

    // Procesar datos de forma segura
    const ingredientsArray = ensureArray(recipe.ingredients)
    const preparationArray = ensureArray(recipe.preparation)

    const imageUrl = recipe.image_url || null

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
            {recipe.name || "Receta sin nombre"}
          </h1>

          {/* Información adicional */}
          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            {recipe.calories && <span>🔥 {recipe.calories} cal</span>}
            {recipe.is_ai_generated && <span>🤖 Generada por IA</span>}
          </div>
        </div>

        {/* Sección de imagen */}
        <div className="relative w-full h-48 sm:h-64 md:h-96 mb-6">
          {imageUrl ? (
            <img
              src={imageUrl || "/placeholder.svg"}
              alt={recipe.name || "Imagen de receta"}
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

          {/* Preparación */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Preparación:</h2>
            {preparationArray.length > 0 ? (
              <ol className="list-decimal pl-5 space-y-3 sm:space-y-4">
                {preparationArray.map((step, index) => (
                  <li key={index} className="text-foreground text-sm sm:text-base">
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground italic text-sm sm:text-base">
                No hay pasos de preparación disponibles
              </p>
            )}
          </div>
        </div>

        {/* Enlaces adicionales */}
        {(recipe.video_url || recipe.source_url) && (
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {recipe.video_url && (
              <Button asChild variant="outline">
                <Link href={recipe.video_url} target="_blank" rel="noopener noreferrer">
                  📹 Ver video
                </Link>
              </Button>
            )}
            {recipe.source_url && (
              <Button asChild variant="outline">
                <Link href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                  🔗 Fuente original
                </Link>
              </Button>
            )}
          </div>
        )}
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
      title: recipe?.name || "Receta",
      description: `Receta: ${recipe?.name || "Ver detalles de la receta"}`,
    }
  } catch (error) {
    return {
      title: "Receta",
      description: "Ver detalles de la receta",
    }
  }
}
