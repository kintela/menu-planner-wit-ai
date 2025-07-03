"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, ExternalLink, Flame, User } from "lucide-react"
import Link from "next/link"
import { VideoModal } from "@/components/video-modal"

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

  const getAuthorName = () => {
    if (!recipe.user_profiles) return "Usuario desconocido"

    const profile = recipe.user_profiles
    if (profile.alias) return profile.alias
    if (profile.full_name) return profile.full_name
    if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name}`
    if (profile.first_name) return profile.first_name
    if (profile.email) return profile.email.split("@")[0]
    return "Usuario desconocido"
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="relative aspect-video bg-gray-200">
          {recipe.image_url ? (
            <img
              src={recipe.image_url || "/placeholder.svg"}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span>Sin imagen</span>
            </div>
          )}

          {/* Video button overlay */}
          {recipe.video_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 left-2 bg-black/70 hover:bg-black/80 text-white"
              onClick={() => setShowVideoModal(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {/* Author overlay */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <User className="h-3 w-3" />
            {getAuthorName()}
          </div>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Title */}
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{recipe.name}</h3>

            {/* Categories */}
            {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.recipe_categories.slice(0, 2).map((rc, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {rc.categories.name}
                  </Badge>
                ))}
                {recipe.recipe_categories.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{recipe.recipe_categories.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Ingredients preview */}
            <p className="text-sm text-gray-600 line-clamp-2">{truncateText(recipe.ingredients, 100)}</p>

            {/* Calories */}
            {recipe.calories && (
              <div className="flex items-center gap-1 text-sm text-orange-600">
                <Flame className="h-4 w-4" />
                <span>{recipe.calories} calorías</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {recipe.is_ai_generated && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    🤖 IA
                  </Badge>
                )}
                {recipe.source_url && (
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" asChild>
                    <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>

              <Button size="sm" variant="outline" asChild>
                <Link href={`/recipes/${recipe.id}`}>Ver receta</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <VideoModal
          videoUrl={recipe.video_url}
          title={recipe.name}
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </>
  )
}
