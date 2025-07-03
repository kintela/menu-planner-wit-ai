"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Eye, ArrowRight, X } from "lucide-react"
import Link from "next/link"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated?: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    id: string
    full_name?: string
    first_name?: string
    last_name?: string
    alias?: string
    avatar_url?: string
    email?: string
  }
  recipe_categories?: Array<{
    categories: {
      id: number
      name: string
    }
  }>
}

interface RecipeCardProps {
  recipe: Recipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)

  const getDisplayName = () => {
    if (!recipe.user_profiles) return "Usuario desconocido"

    const profile = recipe.user_profiles
    if (profile.alias) return profile.alias
    if (profile.full_name) return profile.full_name
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`
    if (profile.first_name) return profile.first_name
    return profile.email || "Usuario desconocido"
  }

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative">
          <img
            src={recipe.image_url || "/placeholder.svg?height=200&width=300&query=recipe"}
            alt={recipe.name}
            className="w-full h-48 object-cover"
          />

          {/* Video Icon - Top Left */}
          {recipe.video_url && (
            <button
              onClick={() => setShowVideoModal(true)}
              className="absolute top-2 left-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              title="Ver video"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}

          {/* Source URL Icon - Top Right */}
          {recipe.source_url && (
            <button
              onClick={() => setShowSourceModal(true)}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              title="Ver fuente"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>

        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex-1">
            <Link href={`/recipes/${recipe.id}`} className="hover:text-blue-600 transition-colors">
              <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.name}</h3>
            </Link>

            <div className="text-sm text-gray-600 mb-2">Por: {getDisplayName()}</div>

            {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {recipe.recipe_categories.slice(0, 2).map((rc, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {rc.categories.name}
                  </Badge>
                ))}
                {recipe.recipe_categories.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{recipe.recipe_categories.length - 2}
                  </Badge>
                )}
              </div>
            )}

            <p className="text-sm text-gray-600 mb-3 line-clamp-3">
              {recipe.ingredients.substring(0, 150)}
              {recipe.ingredients.length > 150 && "..."}
            </p>

            {recipe.calories && (
              <div className="text-sm text-orange-600 font-medium mb-3">🔥 {recipe.calories} cal</div>
            )}
          </div>

          <Button asChild className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white border-0">
            <Link href={`/recipes/${recipe.id}`} className="flex items-center justify-center gap-2">
              Ver receta completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Video: {recipe.name}</h3>
              <button onClick={() => setShowVideoModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              {recipe.video_url.includes("youtube.com") || recipe.video_url.includes("youtu.be") ? (
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${getVideoId(recipe.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title={recipe.name}
                  />
                </div>
              ) : (
                <video controls className="w-full max-h-96">
                  <source src={recipe.video_url} type="video/mp4" />
                  Tu navegador no soporta el elemento de video.
                </video>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {showSourceModal && recipe.source_url && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Fuente: {recipe.name}</h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open(recipe.source_url, "_blank")}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Abrir en nueva pestaña
                </Button>
                <button onClick={() => setShowSourceModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-4 text-sm text-gray-600">
                <p>Algunos sitios web no permiten ser mostrados en marcos por razones de seguridad.</p>
                <p>Si no se carga el contenido, usa el botón "Abrir en nueva pestaña" arriba.</p>
              </div>
              <div className="relative">
                <iframe
                  src={recipe.source_url}
                  className="w-full h-96 border rounded"
                  title={`Fuente de ${recipe.name}`}
                />
                <div className="absolute inset-0 bg-gray-100/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white p-4 rounded shadow-lg text-center">
                    <p className="text-sm text-gray-600 mb-2">¿No se carga el contenido?</p>
                    <Button
                      onClick={() => window.open(recipe.source_url, "_blank")}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Abrir en nueva pestaña
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
