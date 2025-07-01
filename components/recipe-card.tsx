"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, Zap, ExternalLink, Play } from "lucide-react"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  user_id: string
  is_ai_generated: boolean
  video_url?: string
  source_url?: string
  created_at: string
  user_profiles?: {
    full_name: string
    first_name: string
  }
  recipe_categories?: {
    categories: {
      id: number
      name: string
    }
  }[]
}

interface RecipeCardProps {
  recipe: Recipe
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const [imageError, setImageError] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getAuthorName = () => {
    if (recipe.user_profiles?.full_name) {
      return recipe.user_profiles.full_name
    }
    if (recipe.user_profiles?.first_name) {
      return recipe.user_profiles.first_name
    }
    return "Usuario"
  }

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      {/* Imagen */}
      <div className="relative h-48 overflow-hidden rounded-t-lg">
        {recipe.image_url && !imageError ? (
          <img
            src={recipe.image_url || "/placeholder.svg"}
            alt={recipe.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <div className="text-4xl">🍽️</div>
          </div>
        )}

        {/* Badges superpuestos */}
        <div className="absolute top-2 left-2 flex gap-1">
          {recipe.is_ai_generated && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Zap className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="flex-1 p-4">
        {/* Título */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{recipe.name}</h3>

        {/* Categorías */}
        {recipe.recipe_categories && recipe.recipe_categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.recipe_categories.map((rc, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {rc.categories.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Ingredientes (preview) */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.ingredients}</p>

        {/* Información adicional */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          {recipe.calories && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recipe.calories} cal
            </div>
          )}
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {getAuthorName()}
          </div>
        </div>

        {/* Fecha */}
        <p className="text-xs text-gray-400">Creada el {formatDate(recipe.created_at)}</p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/recipes/${recipe.id}`}>Ver Receta</Link>
        </Button>

        {/* Botones adicionales */}
        <div className="flex gap-1">
          {recipe.video_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={recipe.video_url} target="_blank" rel="noopener noreferrer">
                <Play className="h-4 w-4" />
              </a>
            </Button>
          )}

          {recipe.source_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
