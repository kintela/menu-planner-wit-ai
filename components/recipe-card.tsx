"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Users, Star, Eye, ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Recipe {
  id: string
  title: string
  description?: string
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: string
  image_url?: string
  video_url?: string
  source_url?: string
  rating?: number
}

interface RecipeCardProps {
  recipe: Recipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative">
          {recipe.image_url && !imageError ? (
            <div className="relative h-48 w-full">
              <Image
                src={recipe.image_url || "/placeholder.svg"}
                alt={recipe.title}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">Sin imagen</span>
            </div>
          )}

          {recipe.video_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 left-2 h-8 w-8 p-0"
              onClick={() => setShowVideoModal(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg line-clamp-2">
                <Link href={`/recipes/${recipe.id}`} className="hover:text-blue-600 transition-colors">
                  {recipe.title}
                </Link>
              </h3>
              {recipe.description && <p className="text-gray-600 text-sm line-clamp-2 mt-1">{recipe.description}</p>}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500">
              {totalTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{totalTime} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{recipe.servings}</span>
                </div>
              )}
              {recipe.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{recipe.rating}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              {recipe.difficulty && <Badge variant="secondary">{recipe.difficulty}</Badge>}

              {recipe.source_url && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fuente
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{recipe.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVideoModal(false)}>
                ✕
              </Button>
            </div>
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(recipe.video_url)}
                title={recipe.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
