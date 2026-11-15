import { cookies } from "next/headers"
import { readRecipeDetail } from "@/lib/recipes/recipe-server-operations"
import { createClient } from "@/lib/supabase/server"
import RecipeClientPage from "./RecipeClientPage"

async function loadRecipe(id: string) {
  const result = await readRecipeDetail(createClient(await cookies()), id)
  return result.status === 200 && "recipe" in result.body ? result.body.recipe : null
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await loadRecipe(id)
  return <RecipeClientPage params={{ id }} recipe={recipe} error={recipe ? null : "not_found"} />
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await loadRecipe(id)
  return {
    title: recipe?.name || "Receta",
    description: recipe ? `Receta: ${recipe.name}` : "Ver detalles de la receta",
  }
}
