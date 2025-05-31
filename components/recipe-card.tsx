"use client"

import Image from "next/image"
import Link from "next/link"
import { ChefHat, Flame, Users, User } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteRecipeButton } from "@/components/delete-recipe-button"
import { VideoModal } from "@/components/video-modal"
import { SourceLinkButton } from "@/components/source-link-button"
import { getCaloriesPerServing, getCalorieLevel } from "@/lib/calories-calculator"

// Define the RecipeCardProps interface
interface RecipeCardProps {
  recipe: any
  className?: string
}

// Update the RecipeCard component to check if the user is the creator
export function RecipeCard({ recipe, className }: RecipeCardProps) {
  const router = useRouter()

  // Ahora solo usamos el campo calories
  const caloriesPerServing = recipe.calories ? getCaloriesPerServing(recipe.calories) : null
  const calorieLevel = caloriesPerServing ? getCalorieLevel(caloriesPerServing) : null

  // Obtener la información del creador (puede venir de creator o user_profiles)
  const creatorInfo = recipe.creator || recipe.user_profiles || null

  // Función para manejar la eliminación de la receta
  const handleDelete = () => {
    // Refrescar la página para mostrar la lista actualizada
    router.refresh()
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
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
            <User className="h-3 w-3" />
            <span>{creatorInfo.full_name || creatorInfo.email}</span>
          </div>
        )}
      </div>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{recipe.name}</span>
          {caloriesPerServing && (
            <div className="flex items-center gap-1 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className={calorieLevel?.color}>{caloriesPerServing}</span>
              <Users className="h-3 w-3 text-muted-foreground ml-1" />
              <span className="text-xs text-muted-foreground">cal/ración</span>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          <div className="flex flex-wrap gap-1">
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
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">{recipe.ingredients.split("\n")[0]}...</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button asChild className="flex-1">
          <Link href={`/recipes/${recipe.id}`}>Ver</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/recipes/${recipe.id}/edit`}>Editar</Link>
        </Button>
        <DeleteRecipeButton
          recipeId={recipe.id}
          recipeUserId={recipe.user_id}
          recipeName={recipe.name}
          onDelete={handleDelete}
        />
      </CardFooter>
    </Card>
  )
}
