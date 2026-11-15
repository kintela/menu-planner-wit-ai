import { cookies } from "next/headers"
import { RecipesPageClient } from "@/components/recipes-page-client"
import { readPublicCategories, readRecipeListing } from "@/lib/recipes/recipe-server-operations"
import { createClient } from "@/lib/supabase/server"

export default async function RecipesPage() {
  const supabase = createClient(await cookies())
  const [recipesResult, categoriesResult] = await Promise.all([
    readRecipeListing(supabase),
    readPublicCategories(supabase),
  ])

  const recipes = recipesResult.status === 200 && "recipes" in recipesResult.body
    ? recipesResult.body.recipes
    : []
  const categories = categoriesResult.status === 200 && "categories" in categoriesResult.body
    ? categoriesResult.body.categories
    : []

  return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} />
}
