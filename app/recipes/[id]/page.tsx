import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean | null
  video_url: string | null
  source_url: string | null
  calories: number | null
  created_at: string
}

async function getRecipe(id: string): Promise<Recipe | null> {
  try {
    console.log("🔍 DEBUG - getRecipe iniciado para ID:", id)

    const supabase = createServerClient()

    // Consulta muy simple sin transformaciones complejas
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error || !recipe) {
      console.error("❌ Error o receta no encontrada:", error?.message || "Sin datos")
      return null
    }

    console.log("✅ Receta encontrada:", recipe.name)
    return recipe
  } catch (error) {
    console.error("❌ Error crítico:", error)
    return null
  }
}

// Función simplificada para procesar texto
function processText(text: string | null | undefined): string[] {
  if (!text) return []

  // Si es un string simple, dividir por saltos de línea
  if (typeof text === "string") {
    return text.split("\n").filter((line) => line.trim() !== "")
  }

  return []
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  console.log("🔍 DEBUG - RecipePage iniciado con ID:", params.id)

  // Validación básica del ID
  const numericId = Number.parseInt(params.id, 10)
  if (isNaN(numericId) || numericId <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">ID inválido</h1>
          <Button asChild>
            <Link href="/recipes">Volver a recetas</Link>
          </Button>
        </div>
      </div>
    )
  }

  try {
    const recipe = await getRecipe(params.id)

    if (!recipe) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">Receta no encontrada</h1>
            <p className="text-gray-600 mb-4">La receta con ID {params.id} no existe.</p>
            <Button asChild>
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </div>
        </div>
      )
    }

    // Procesar ingredientes y preparación de forma simple
    const ingredients = processText(recipe.ingredients)
    const preparation = processText(recipe.preparation)

    return (
      <div className="min-h-screen bg-white">
        {/* Header fijo para móvil */}
        <div className="sticky top-0 bg-white border-b p-4 z-10">
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href="/recipes" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/recipes/${params.id}/edit`}>Editar</Link>
            </Button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-4 space-y-6">
          {/* Título */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
            {recipe.calories && <p className="text-sm text-gray-600 mt-2">🔥 {recipe.calories} calorías</p>}
          </div>

          {/* Imagen */}
          {recipe.image_url && (
            <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={recipe.image_url || "/placeholder.svg"}
                alt={recipe.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            </div>
          )}

          {/* Ingredientes */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Ingredientes</h2>
            {ingredients.length > 0 ? (
              <ul className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    <span className="text-gray-800 text-sm">{ingredient}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No hay ingredientes disponibles</p>
            )}
          </div>

          {/* Preparación */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Preparación</h2>
            {preparation.length > 0 ? (
              <ol className="space-y-3">
                {preparation.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-800 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 italic">No hay pasos de preparación disponibles</p>
            )}
          </div>

          {/* Enlaces adicionales */}
          {(recipe.video_url || recipe.source_url) && (
            <div className="space-y-3">
              {recipe.video_url && (
                <Button asChild className="w-full" variant="outline">
                  <Link href={recipe.video_url} target="_blank" rel="noopener noreferrer">
                    📹 Ver video de la receta
                  </Link>
                </Button>
              )}
              {recipe.source_url && (
                <Button asChild className="w-full" variant="outline">
                  <Link href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                    🔗 Ver fuente original
                  </Link>
                </Button>
              )}
            </div>
          )}

          {/* Espaciado inferior para móvil */}
          <div className="h-8"></div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("❌ Error crítico en RecipePage:", error)

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4 text-red-600">Error al cargar la receta</h1>
          <p className="text-gray-600 mb-4">Ha ocurrido un error inesperado.</p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Ir al inicio</Link>
            </Button>
          </div>
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
