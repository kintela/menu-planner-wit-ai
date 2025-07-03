"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, ExternalLink, Clock } from "lucide-react"

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
  category_id: number | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  alias: string | null
  avatar_url: string | null
}

interface RecipeCardProps {
  recipe: Recipe
  userProfile?: UserProfile | null
}

export default function RecipeCard({ recipe, userProfile }: RecipeCardProps) {
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url
  }

  const VideoModal = () => {
    if (!showVideoModal || !recipe.video_url) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">{recipe.name}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
          <div className="aspect-video">
            <iframe
              src={getYouTubeEmbedUrl(recipe.video_url)}
              title={recipe.name}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        <div className="relative aspect-video bg-gray-100">
          {recipe.image_url && !imageError ? (
            <Image
              src={recipe.image_url || "/placeholder.svg"}
              alt={recipe.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <div className="text-gray-400 text-center">
                <div className="text-4xl mb-2">🍽️</div>
                <div className="text-sm">Sin imagen</div>
              </div>
            </div>
          )}

          {recipe.video_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 left-2 bg-black/70 text-white hover:bg-black/80"
              onClick={(e) => {
                e.preventDefault()
                setShowVideoModal(true)
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}

          {recipe.is_ai_generated && <Badge className="absolute top-2 right-2 bg-purple-600 text-white">IA</Badge>}
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Link href={`/recipes/${recipe.id}`}>
                <h3 className="font-semibold text-lg line-clamp-2 hover:text-blue-600 transition-colors">
                  {recipe.name}
                </h3>
              </Link>

              {userProfile && (
                <p className="text-sm text-gray-600 mt-1">
                  por {userProfile.alias || userProfile.full_name || userProfile.email}
                </p>
              )}
            </div>

            <p className="text-sm text-gray-600 line-clamp-3">
              {recipe.ingredients.length > 100 ? `${recipe.ingredients.substring(0, 100)}...` : recipe.ingredients}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500">
              {recipe.calories && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{recipe.calories} cal</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <VideoModal />
    </>
  )
}
