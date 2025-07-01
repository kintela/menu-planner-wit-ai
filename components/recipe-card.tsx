"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Eye, ExternalLink } from "lucide-react"
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
  const [imageError, setImageError] = useState(false)

  const creatorName =
    recipe.user_profiles?.alias ||
    recipe.user_profiles?.full_name ||
    recipe.user_profiles?.first_name ||
    "Usuario anónimo"

  const categories = recipe.recipe_categories?.map((rc) => rc.categories) || []

  return (
    <>
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        <div className="relative">
          {recipe.image_url && !imageError ? (
            <div className="relative h-48 w-full">
              <Image
                src={recipe.image_url || "/placeholder.svg"}
                alt={recipe.name}
                fill
                className="object-cover rounded-t-lg"
                onError={() => setImageError(true)}
              />
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
          ) : (
            <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
              <span className="text-gray-500">Sin imagen</span>
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
          )}
        </div>

        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-2">{recipe.name}</h3>
            {recipe.is_ai_generated && (
              <Badge variant="secondary" className="ml-2 text-xs">
                IA
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.ingredients}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {categories.slice(0, 2).map((category) => (
              <Badge key={category.id} variant="outline" className="text-xs">
                {category.name}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{categories.length - 2}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Por {creatorName}</span>
            {recipe.calories && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                <span>{recipe.calories} cal</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Link href={`/recipes/${recipe.id}`} className="flex-1">
            <Button variant="outline" className="w-full bg-transparent">
              Ver Receta
            </Button>
          </Link>
          {recipe.source_url && (
            <Button variant="ghost" size="sm" onClick={() => window.open(recipe.source_url, "_blank")}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">{recipe.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVideoModal(false)}>
                ✕
              </Button>
            </div>
            <div className="p-4">
              <div className="aspect-video">
                <iframe
                  src={recipe.video_url}
                  className="w-full h-full rounded"
                  allowFullScreen
                  title={`Video de ${recipe.name}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
