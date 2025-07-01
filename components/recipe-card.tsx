"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Play, Sparkles, User } from "lucide-react"
import Image from "next/image"
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
    full_name?: string
    first_name?: string
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
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)

  const authorName = recipe.user_profiles?.full_name || recipe.user_profiles?.first_name || "Usuario"
  const categories = recipe.recipe_categories?.map((rc) => rc.categories.name) || []

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden relative">
        {/* Video Button - Top Right */}
        {recipe.video_url && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black/90 text-white border-0"
            onClick={() => setIsVideoModalOpen(true)}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        <CardHeader className="p-0">
          <div className="relative h-48 w-full overflow-hidden">
            <Image
              src={recipe.image_url || "/placeholder.svg?height=200&width=300&text=Sin+imagen"}
              alt={recipe.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {recipe.is_ai_generated && (
              <Badge className="absolute top-2 left-2 bg-purple-600 hover:bg-purple-700">
                <Sparkles className="h-3 w-3 mr-1" />
                IA
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <CardTitle className="text-lg mb-2 line-clamp-2">{recipe.name}</CardTitle>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.map((category) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Ingredients Preview */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.ingredients}</p>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{authorName}</span>
            </div>
            {recipe.calories && <span>{recipe.calories} cal</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button asChild className="flex-1">
              <Link href={`/recipes/${recipe.id}`}>Ver Receta</Link>
            </Button>
            {recipe.source_url && (
              <Button variant="outline" size="sm" asChild>
                <Link href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {recipe.video_url && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          videoUrl={recipe.video_url}
          title={recipe.name}
        />
      )}
    </>
  )
}
