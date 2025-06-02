"use client"

import Image from "next/image"
import Link from "next/link"
import { ChefHat, Flame, Users, User, Eye, Pencil } from "lucide-react"

import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteRecipeButton } from "@/components/delete-recipe-button"
import { VideoModal } from "@/components/video-modal"
import { SourceLinkButton } from "@/components/source-link-button"
import { getCaloriesPerServing, getCalorieLevel } from "@/lib/calories-calculator"
import { StarRating } from "@/components/star-rating"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Define the RecipeCardProps interface
interface RecipeCardProps {
  recipe: any
  className?: string
}

// Update the RecipeCard component to check if the user is the creator
export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const router = useRouter()
  const { user } = useAuth()

  // Debug: Log the recipe object to see its structure
  console.log("Recipe object:", recipe)
  console.log("Recipe ID:", recipe.id)

  // Verificar si el usuario actual es el propietario de la receta
  const isOwner = user && recipe.user_id === user.id
  const canEdit = user && isOwner

  // Ahora solo usamos el campo calories
  const caloriesPerServing = recipe.calories ? getCaloriesPerServing(recipe.calories) : null
  const calorieLevel = caloriesPerServing ? getCalorieLevel(caloriesPerServing) : null

  // Obtener la información del creador (puede venir de creator o user_profiles)
  const creatorInfo = recipe.creator || recipe.user_profiles || null

  // Debug temporal para ver los datos del creador
  console.log("Creator info for recipe:", recipe.name, creatorInfo)

  // Función para manejar la eliminación de la receta
  const handleDelete = () => {
    // Refrescar la página para mostrar la lista actualizada
    router.refresh()
  }

  return (
    <TooltipProvider>
      <Card className={cn("overflow-hidden flex flex-col h-full", className)}>
        <div className="aspect-video relative">
          {recipe.image_url ? (
            <Image src={recipe.image_url || "/placeholder.svg"} alt={recipe.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ChefHat className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {recipe.is_ai_generated && (
            <Badge className="absolute top-2 right-2" variant="secondary">
              Generado por IA
            </Badge>
          )}
          {/* Mostrar iconos de video y fuente */}
          <div className="absolute top-2 left-2 flex gap-2">
            {recipe.video_url && <VideoModal videoUrl={recipe.video_url} recipeName={recipe.name} />}
          </div>
          {recipe.source_url && <SourceLinkButton sourceUrl={recipe.source_url} recipeName={recipe.name} />}

          {/* Información del creador en la esquina inferior derecha de la imagen */}
          {creatorInfo && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs bg-black/60 text-white backdrop-blur-sm rounded px-2 py-1 shadow-md">
              {creatorInfo.avatar_url ? (
                <Image
                  src={creatorInfo.avatar_url || "/placeholder.svg"}
                  alt="Avatar"
                  width={12}
                  height={12}
                  className="h-3 w-3 rounded-full object-cover"
                />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span>
                {creatorInfo.alias ||
                  (creatorInfo.first_name && creatorInfo.last_name
                    ? `${creatorInfo.first_name} ${creatorInfo.last_name}`
                    : creatorInfo.full_name || creatorInfo.email)}
              </span>
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="whitespace-nowrap overflow-hidden text-ellipsis">{recipe.name}</CardTitle>
            </TooltipTrigger>
            <TooltipContent>
              <p>{recipe.name}</p>
            </TooltipContent>
          </Tooltip>
          <CardDescription>
            <div className="flex flex-wrap gap-1 mt-1">
              {recipe.categories?.map((category) => (
                <Badge key={category.id} variant="outline" className="mr-1">
                  {category.name}
                </Badge>
              ))}
              {calorieLevel && (
                <Badge variant="outline" className={cn("text-xs", calorieLevel.color)}>
                  {calorieLevel.level}
                </Badge>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow pt-0">
          {caloriesPerServing && (
            <div className="flex items-center gap-1 text-sm mb-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className={calorieLevel?.color}>{caloriesPerServing}</span>
              <Users className="h-3 w-3 text-muted-foreground ml-1" />
              <span className="text-xs text-muted-foreground">cal/ración</span>
            </div>
          )}
          <StarRating recipeId={recipe.id} />
        </CardContent>
        <CardFooter className="flex gap-2 mt-auto">
          <Button asChild className="flex-1" size="sm">
            <Link href={`/recipes/${recipe.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>

          {canEdit ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/recipes/${recipe.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled size="sm">
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          <DeleteRecipeButton
            recipeId={recipe.id}
            recipeUserId={recipe.user_id}
            recipeName={recipe.name}
            onDelete={handleDelete}
            iconOnly={true}
          />
        </CardFooter>
      </Card>
    </TooltipProvider>
  )
}
