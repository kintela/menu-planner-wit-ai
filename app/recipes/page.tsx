import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  try {
    const supabase = createClient()

    // Get recipes
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return { recipes: [], categories: [] }
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return { recipes: recipes || [], categories: [] }
    }

    return {
      recipes: recipes || [],
      categories: categories || [],
    }
  } catch (error) {
    console.error("Error in getRecipes:", error)
    return { recipes: [], categories: [] }
  }
}

export default async function RecipesPage() {
  const { recipes, categories } = await getRecipes()

  return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} />
}
