"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, X } from "lucide-react"

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

  const getVideoEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      const videoId = url.split("v=")[1]?.split("&")[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    return url
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-video bg-gray-200">
          {recipe.image_url ? (
            <img
              src={recipe.image_url || "/placeholder.svg"}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">Sin imagen</div>
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
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg leading-tight">{recipe.name}</h3>
            {recipe.is_ai_generated && (
              <Badge variant="secondary" className="ml-2 text-xs">
                🤖 IA
              </Badge>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.ingredients.substring(0, 100)}...</p>

          {recipe.calories && <div className="text-sm text-gray-500 mb-3">🔥 {recipe.calories} calorías</div>}

          <div className="flex items-center justify-between">
            <Link href={`/recipes/${recipe.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
              Ver receta →
            </Link>

            {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
              <div className="flex gap-1">
                {recipe.recipe_categories.slice(0, 2).map((rc, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {rc.categories.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{recipe.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVideoModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video">
              <iframe
                src={getVideoEmbedUrl(recipe.video_url)}
                className="w-full h-full"
                allowFullScreen
                title={`Video de ${recipe.name}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
