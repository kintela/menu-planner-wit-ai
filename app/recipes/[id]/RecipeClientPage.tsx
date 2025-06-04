"use client"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User } from "lucide-react"
import { RecipeImage } from "@/components/recipe-image"
import { VideoEmbed } from "@/components/video-embed"

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
  user_id: string | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  alias: string | null
  avatar_url: string | null
}

interface RecipeClientPageProps {
  params: { id: string }
  recipe: Recipe | null
  user: UserProfile | null
  error: string | null
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

// Componente para mostrar información del usuario
function UserInfo({ user }: { user: UserProfile | null }) {
  if (!user) return null

  const displayName = user.alias || user.full_name || user.email

  return (
    <div className="flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
      {user.avatar_url ? (
        <img
          src={user.avatar_url || "/placeholder.svg"}
          alt={displayName}
          className="w-6 h-6 rounded-full object-cover"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <span className="truncate max-w-32">{displayName}</span>
    </div>
  )
}

export default function RecipeClientPage({ params, recipe, user, error }: RecipeClientPageProps) {
  const [showVideo, setShowVideo] = useState(false)

  console.log("🔍 DEBUG - RecipeClientPage iniciado con:", {
    id: params.id,
    hasRecipe: !!recipe,
    hasUser: !!user,
    error,
  })

  // Manejar errores
  if (error === "invalid_id") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4">ID inválido</h1>
          <p className="text-gray-600 mb-4">El ID de la receta no es válido.</p>
          <Button asChild>
            <Link href="/recipes">Volver a recetas</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error === "not_found" || !recipe) {
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

        {/* Imagen con overlays */}
        <div className="relative w-full h-64 md:h-80 bg-gray-100 rounded-lg overflow-hidden">
          <RecipeImage src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />

          {/* Video button - esquina superior izquierda */}
          {recipe.video_url && (
            <button
              onClick={() => setShowVideo(!showVideo)}
              className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10 transition-colors"
              title="Ver video de la receta"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Source link - esquina superior derecha */}
          {recipe.source_url && (
            <button
              onClick={() => window.open(recipe.source_url, "_blank", "noopener,noreferrer")}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 z-10 transition-colors"
              title="Ver fuente original"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
          )}

          {/* User info - esquina inferior derecha */}
          <div className="absolute bottom-2 right-2">
            <UserInfo user={user} />
          </div>
        </div>

        {/* Video embed */}
        {showVideo && recipe.video_url && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Video de la receta</h2>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Cerrar video"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VideoEmbed url={recipe.video_url} title={recipe.name} />
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

        {/* Espaciado inferior para móvil */}
        <div className="h-8"></div>
      </div>
    </div>
  )
}
