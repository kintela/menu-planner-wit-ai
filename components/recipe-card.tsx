"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Video, ExternalLink } from "lucide-react"
import Link from "next/link"
import { VideoModal } from "./video-modal"

interface Recipe {
  id: string
  title: string
  description?: string
  ingredients?: string
  preparation?: string
  image_url?: string
  video_url?: string
  external_url?: string
  calories?: number
  user_id: string
  is_ai_generated?: boolean
  categories?: Array<{
    id: string
    name: string
  }>
  user_profile?: {
    display_name?: string
    full_name?: string
  }
}

interface RecipeCardProps {
  recipe: Recipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  const authorName = recipe.user_profile?.display_name || recipe.user_profile?.full_name || "Usuario"

  const handleVideoClick = () => {
    setIsVideoModalOpen(true)
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative">
          <img
            src={recipe.image_url || `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(recipe.title)}`}
            alt={recipe.title}
            className="w-full h-48 object-cover"
          />

          {/* Video button in top right corner of image */}
          {recipe.video_url && (
            <button
              onClick={handleVideoClick}
              className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg transition-colors"
              aria-label="Ver video de la receta"
            >
              <Video className="h-4 w-4" />
            </button>
          )}

          {/* AI Generated Badge */}
          {recipe.is_ai_generated && (
            <Badge className="absolute top-2 left-2 bg-purple-600 hover:bg-purple-700">✨ IA</Badge>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-lg line-clamp-2">{recipe.title}</h3>

            {/* Categories */}
            {recipe.categories && recipe.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.categories.slice(0, 2).map((category) => (
                  <Badge key={category.id} variant="secondary" className="text-xs">
                    {category.name}
                  </Badge>
                ))}
                {recipe.categories.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{recipe.categories.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Description/Ingredients */}
            {(recipe.description || recipe.ingredients) && (
              <p className="text-sm text-gray-600 line-clamp-2">{recipe.description || recipe.ingredients}</p>
            )}

            {/* Author and Calories */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{authorName}</span>
              </div>
              {recipe.calories && <span className="font-medium">{recipe.calories} cal</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Link href={`/recipes/${recipe.id}`}>
                <Button variant="outline" size="sm">
                  Ver Receta
                </Button>
              </Link>

              {recipe.external_url && (
                <Link href={recipe.external_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {recipe.video_url && (
        <VideoModal
          videoUrl={recipe.video_url}
          recipeName={recipe.title}
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
        />
      )}
    </>
  )
}
