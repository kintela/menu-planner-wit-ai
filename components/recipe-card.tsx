"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, ExternalLink, Play, Sparkles } from "lucide-react"
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
  const categories = recipe.recipe_categories?.map((rc) => rc.categories) || []

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 relative overflow-hidden">
        {/* Video Button - Top Right */}
        {recipe.video_url && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black/90 text-white border-0 p-2"
            onClick={() => setIsVideoModalOpen(true)}
            aria-label="Ver video de la receta"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {/* AI Badge - Top Left */}
        {recipe.is_ai_generated && (
          <Badge className="absolute top-2 left-2 z-10 bg-purple-600 hover:bg-purple-700 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            IA
          </Badge>
        )}

        {/* Recipe Image */}
        <div className="relative h-48 overflow-hidden">
          <Image
            src={recipe.image_url || "/placeholder.svg?height=200&width=300&text=Sin+imagen"}
            alt={recipe.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
              <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                {recipe.name}
              </Link>
            </CardTitle>
          </div>
          <CardDescription className="text-sm text-gray-600">Por {authorName}</CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.slice(0, 3).map((category) => (
                <Badge key={category.id} variant="outline" className="text-xs">
                  {category.name}
                </Badge>
              ))}
              {categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{categories.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Recipe Description */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">{recipe.preparation}</p>

          {/* Recipe Stats */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <div className="flex items-center gap-4">
              {recipe.calories && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{recipe.calories} cal</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>4 porciones</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild className="flex-1" size="sm">
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
