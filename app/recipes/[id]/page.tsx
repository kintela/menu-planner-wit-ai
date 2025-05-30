import Image from "next/image"
import Link from "next/link"
import { ChefHat, ExternalLink, Video, Flame, Users, ChevronLeft } from "lucide-react"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteRecipeButton } from "@/components/delete-recipe-button"
import { VideoEmbed } from "@/components/video-embed"
import { getCaloriesPerServing, getCalorieLevel } from "@/lib/calories-calculator"

interface RecipePageProps {
  params: {
    id: string
  }
}

export default async function RecipePage({ params }: RecipePageProps) {
  const supabase = createServerClient()

  // Obtener la receta
  const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", params.id).single()

  if (error || !recipe) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Receta no encontrada</h1>
        <p className="text-muted-foreground">La receta que buscas no existe o ha sido eliminada.</p>
        <Button asChild className="mt-4">
          <Link href="/recipes">Volver a Recetas</Link>
        </Button>
      </div>
    )
  }

  // Obtener las categorías de la receta
  const { data: recipeCategories } = await supabase
    .from("recipe_categories")
    .select(`
      category:category_id (
        id,
        name
      )
    `)
    .eq("recipe_id", recipe.id)

  // Extraer las categorías
  const categories = recipeCategories?.map((rc) => rc.category) || []

  // Calcular información de calorías
  const caloriesPerServing = recipe.calories ? getCaloriesPerServing(recipe.calories) : null
  const calorieLevel = caloriesPerServing ? getCalorieLevel(caloriesPerServing) : null

  return (
    <div className="container py-10">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/weekly-menu">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver a Menú Semanal
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/2">
          <div className="aspect-video relative rounded-lg overflow-hidden">
            {recipe.image_url ? (
              <Image src={recipe.image_url || "/placeholder.svg"} alt={recipe.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <ChefHat className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="md:w-1/2">
          <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>

          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category: any) => (
              <Badge key={category.id} variant="secondary">
                {category.name}
              </Badge>
            ))}
            {recipe.is_ai_generated && <Badge variant="outline">Generado por IA</Badge>}
            {calorieLevel && (
              <Badge variant="outline" className={calorieLevel.color}>
                {calorieLevel.level}
              </Badge>
            )}
          </div>

          {/* Información nutricional */}
          {recipe.calories && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Flame className="mr-2 h-5 w-5 text-orange-500" />
                  Información Nutricional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{recipe.calories}</div>
                    <div className="text-sm text-muted-foreground">Calorías totales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{caloriesPerServing}</div>
                    <div className="text-sm text-muted-foreground flex items-center justify-center">
                      <Users className="h-3 w-3 mr-1" />
                      Por porción (4 pers.)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {recipe.source_url && (
            <div className="mb-4">
              <Button variant="outline" size="sm" asChild>
                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver fuente original
                </a>
              </Button>
            </div>
          )}

          {recipe.video_url && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="mr-2 h-5 w-5" />
                  Video de preparación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VideoEmbed url={recipe.video_url} title={`Video de preparación de ${recipe.name}`} />
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients ? (
                <ul className="list-disc pl-5 space-y-1">
                  {recipe.ingredients.split("\n").map((ingredient: string, index: number) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No hay ingredientes disponibles para esta receta.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preparación</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.preparation ? (
                <div className="space-y-2">
                  {recipe.preparation.split("\n").map((step: string, index: number) => (
                    <p key={index}>{step}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No hay instrucciones de preparación disponibles para esta receta.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex gap-4">
            <Button asChild>
              <Link href="/recipes">Volver a Recetas</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/recipes/${params.id}/edit`}>Editar Receta</Link>
            </Button>
            <DeleteRecipeButton recipeId={Number.parseInt(params.id)} recipeName={recipe.name} />
          </div>
        </div>
      </div>
    </div>
  )
}
