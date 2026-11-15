"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChefHat, Flame, User, Video, Eye, X, ArrowRight, Edit, Share2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { DeleteRecipeButton } from "./delete-recipe-button"
import { useToast } from "@/hooks/use-toast"
import type { PublicRecipe as Recipe } from "@/lib/recipes/recipe-domain"

interface RecipeCardProps {
  recipe: Recipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { toast } = useToast()
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const getYouTubeEmbedUrl = (url: string) => {
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

  const getCreatorName = () => {
    return recipe.author_alias || "Usuario"
  }

  const handleShareRecipe = async () => {
    const recipeUrl = typeof window !== "undefined" ? `${window.location.origin}/recipes/${recipe.id}` : ""

    if (!recipeUrl) {
      toast({
        title: "No se pudo copiar",
        description: "No se ha podido generar el enlace de la receta.",
        variant: "destructive",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(recipeUrl)
      toast({
        title: "Enlace copiado",
        description: "La URL de la receta ya está en el portapapeles.",
      })
    } catch {
      toast({
        title: "No se pudo copiar",
        description: "Tu navegador no permitió copiar el enlace automáticamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
        <div className="relative aspect-video">
          {recipe.image_url && !imageError ? (
            <Image
              src={recipe.image_url || "/placeholder.svg"}
              alt={recipe.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <ChefHat className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Share button - upper left corner */}
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 left-2 h-8 w-8 p-0 bg-black/70 text-white hover:bg-black/80"
            onClick={handleShareRecipe}
            title="Copiar enlace de la receta"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Video button - upper left area, next to share */}
          {recipe.video_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 left-12 h-8 w-8 p-0 bg-black/70 text-white hover:bg-black/80"
              onClick={() => setShowVideoModal(true)}
              title="Ver vídeo"
            >
              <Video className="h-4 w-4" />
            </Button>
          )}

          {/* Source link button - right corner with eye icon */}
          {recipe.source_url && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/70 text-white hover:bg-black/80"
              onClick={() => setShowSourceModal(true)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {recipe.is_ai_generated && <Badge className="absolute top-12 right-2 bg-purple-600 text-white">🤖 IA</Badge>}

          {/* Creator info overlay */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs bg-black/60 text-white backdrop-blur-sm rounded px-2 py-1">
              <User className="h-3 w-3" />
              <span>{getCreatorName()}</span>
          </div>

          {/* Icono flotante de eliminar receta: siempre visible (deshabilitado con tooltip si no tiene permisos) */}
          {recipe.can_delete && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
              <DeleteRecipeButton recipeId={String(recipe.id)} recipeName={recipe.name} iconOnly />
            </div>
          )}

        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg line-clamp-2">
            <Link href={`/recipes/${recipe.id}`} className="hover:text-blue-600 transition-colors">
              {recipe.name}
            </Link>
          </CardTitle>

          {/* Mostrar rating debajo del nombre */}
          <div className="text-sm text-amber-700" aria-label={`${recipe.rating_count} valoraciones`}>
            {recipe.rating_count > 0 ? `★ ${recipe.rating_average?.toFixed(1)} (${recipe.rating_count})` : "Sin valoraciones"}
          </div>

          {/* Categories */}
          {recipe.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.categories.slice(0, 3).map((category) => (
                <Badge key={category.id} variant="outline" className="text-xs">
                  {category.name}
                </Badge>
              ))}
              {recipe.categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{recipe.categories.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 pt-0 flex flex-col">
          <p className="text-gray-600 text-sm line-clamp-3 mb-3">
            {recipe.ingredients.length > 150 ? `${recipe.ingredients.substring(0, 150)}...` : recipe.ingredients}
          </p>

          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            {recipe.calories && (
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>{recipe.calories} cal</span>
              </div>
            )}
          </div>

          {/* Recipe buttons */}
          <div className="mt-auto flex gap-2">
            <Link href={`/recipes/${recipe.id}`} className="flex-1">
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0">
                Ver
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

                  {recipe.can_edit === true && (
                    <Link href={`/recipes/${recipe.id}/edit`} className="flex-1">
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white border-0">
                        Editar
                        <Edit className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
          </div>
        </CardContent>
      </Card>

      {/* Video Modal */}
      {showVideoModal && recipe.video_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">{recipe.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowVideoModal(false)}>
                <X className="h-4 w-4" />
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
      )}

      {/* Source URL Modal */}
      {showSourceModal && recipe.source_url && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Fuente: {recipe.name}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(recipe.source_url!, "_blank")}>
                  Abrir en nueva pestaña
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSourceModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="h-[70vh] relative">
              <iframe
                src={recipe.source_url}
                title={`Fuente de ${recipe.name}`}
                className="w-full h-full"
                allowFullScreen
                onError={() => {
                  // Handle iframe error
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-center p-4 bg-white rounded-lg shadow-lg pointer-events-auto">
                  <p className="text-sm text-gray-600 mb-2">
                    Si no se carga el contenido, algunos sitios web bloquean la visualización en marcos.
                  </p>
                  <Button variant="default" size="sm" onClick={() => window.open(recipe.source_url!, "_blank")}>
                    Ver en nueva pestaña
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
