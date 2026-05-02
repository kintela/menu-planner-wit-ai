"use client"
import { useAuth } from '@/components/auth/auth-provider'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Edit, ExternalLink } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
    <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
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
  const { user: sessionUser } = useAuth()

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

  const hasVideo = Boolean(recipe.video_url)
  const hasImage = Boolean(recipe.image_url)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fijo para móvil */}
      <div className="sticky top-0 bg-white border-b p-4 z-10">
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" size="sm">
            <Link href="/recipes" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          {(() => {
            const isOwner = !!(sessionUser && recipe && recipe.user_id === sessionUser.id)
            const editId = (recipe?.id != null ? String(recipe.id) : params.id)
            if (!editId || editId === 'undefined') return null
            const tooltipMsg = !sessionUser
              ? "Inicia sesión para editar. Solo puedes editar tus propias recetas"
              : !isOwner
                ? "Solo puedes editar tus propias recetas"
                : "Editar receta"
            return (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isOwner ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/recipes/${editId}/edit`} className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Editar
                        </Link>
                      </Button>
                    ) : (
                      <button
                        type="button"
                        aria-disabled="true"
                        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 text-gray-500 text-sm font-medium h-9 px-3 opacity-80 cursor-not-allowed select-none"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                    )}
                  </TooltipTrigger>
                  {!isOwner && (
                    <TooltipContent side="bottom">
                      <p className="max-w-[240px] text-center leading-snug">{tooltipMsg}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })()}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mx-auto max-w-6xl p-4 space-y-6">
        {/* Título */}
        <div className="rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{recipe.name}</h1>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {recipe.calories && (
                  <p className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                    🔥 {recipe.calories} calorías
                  </p>
                )}
                <UserInfo user={user} />
                {recipe.source_url && (
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <a href={recipe.source_url} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="h-4 w-4" />
                      Fuente original
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {hasImage && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <RecipeImage
                  src={recipe.image_url}
                  alt={recipe.name}
                  className="aspect-[4/3] w-full bg-slate-100 object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.5fr)]">
          {/* Ingredientes */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Ingredientes</h2>
            {ingredients.length > 0 ? (
              <ul className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-3 mt-1 h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-sm leading-6 text-gray-800">{ingredient}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No hay ingredientes disponibles</p>
            )}
          </div>

          {/* Preparación */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Preparación</h2>
            {preparation.length > 0 ? (
              <ol className="space-y-4">
                {preparation.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-3 mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-gray-800">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 italic">No hay pasos de preparación disponibles</p>
            )}
          </div>
        </div>

        {/* Video debajo del contenido principal */}
        {hasVideo && recipe.video_url && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Video de preparación</h2>
            <VideoEmbed url={recipe.video_url} title={`Video de ${recipe.name}`} />
          </div>
        )}

        {/* Espaciado inferior para móvil */}
        <div className="h-8"></div>
      </div>
    </div>
  )
}
