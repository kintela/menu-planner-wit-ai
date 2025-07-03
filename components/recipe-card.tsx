"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Eye, X, ArrowRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`
    }
    if (profile.first_name) return profile.first_name
    if (profile.email) return profile.email.split("@")[0]
    return "Usuario"
  }

  const getVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  const categories = recipe.recipe_categories?.map((rc) => rc.categories.name) || []
  const displayName = getDisplayName()

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url || "/placeholder.svg"}
              alt={recipe.name}
              width={400}
              height={200}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <div className="text-gray-400 text-4xl">🍽️</div>
            </div>
          )}

          {/* Video button - top left */}
          {recipe.video_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 left-2 p-2 bg-black/70 hover:bg-black/80 text-white"
              onClick={() => setShowVideoModal(true)}
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}

          {/* Source URL button - top right */}
          {recipe.source_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black/80 text-white"
              onClick={() => setShowSourceModal(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex-1">
            <Link href={`/recipes/${recipe.id}`} className="block">
              <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                {recipe.name}
              </h3>
            </Link>

            <div className="space-y-2 mb-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Por:</span> {displayName}
              </p>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 2).map((category, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                  {categories.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{categories.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 line-clamp-2">
                <span className="font-medium">Ingredientes:</span> {recipe.ingredients}
              </p>

              {recipe.calories && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Calorías:</span> {recipe.calories} cal
                </p>
              )}
            </div>
          </div>

          <Link href={`/recipes/${recipe.id}`} className="mt-auto">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Ver receta completa
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Video: {recipe.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVideoModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video">
              {recipe.video_url.includes("youtube.com") || recipe.video_url.includes("youtu.be") ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getVideoId(recipe.video_url)}`}
                  className="w-full h-full"
                  allowFullScreen
                  title={recipe.name}
                />
              ) : (
                <video src={recipe.video_url} controls className="w-full h-full" title={recipe.name} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {showSourceModal && recipe.source_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Fuente: {recipe.name}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(recipe.source_url, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir en nueva pestaña
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSourceModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative h-[calc(90vh-80px)]">
              <iframe src={recipe.source_url} className="w-full h-full border-0" title={`Fuente de ${recipe.name}`} />
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-white p-4 rounded-lg shadow-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Si no se carga el contenido, algunos sitios web bloquean la visualización en marcos.
                  </p>
                  <p className="text-xs text-gray-500">
                    Usa el botón "Abrir en nueva pestaña" para ver el contenido completo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
