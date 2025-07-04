import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"
import type { Recipe, Category } from "@/lib/types"

async function getRecipes(): Promise<Recipe[]> {
  try {
    console.log("Starting to fetch recipes...")
    const supabase = createClient()

    // First, get all recipes with basic info
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("name", { ascending: true })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return []
    }

    if (!recipes || recipes.length === 0) {
      console.log("No recipes found")
      return []
    }

    console.log(`Found ${recipes.length} recipes`)

    // Get user profiles separately
    const userIds = [...new Set(recipes.map((recipe) => recipe.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, alias, avatar_url")
      .in("id", userIds)

    // Get recipe categories separately
    const recipeIds = recipes.map((recipe) => recipe.id)
    const { data: recipeCategories } = await supabase
      .from("recipe_categories")
      .select(`
        recipe_id,
        categories (
          id,
          name
        )
      `)
      .in("recipe_id", recipeIds)

    // Combine the data
    const recipesWithProfiles = recipes.map((recipe) => {
      const profile = profiles?.find((p) => p.id === recipe.user_id)
      const categories =
        recipeCategories
          ?.filter((rc) => rc.recipe_id === recipe.id)
          ?.map((rc) => rc.categories)
          ?.filter(Boolean) || []

      return {
        ...recipe,
        user_profiles: profile || null,
        categories,
      }
    })

    console.log("Successfully combined recipe data")
    return recipesWithProfiles
  } catch (error) {
    console.error("Error in getRecipes:", error)
    return []
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createClient()
    const { data: categories, error } = await supabase.from("categories").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching categories:", error)
      return []
    }

    return categories || []
  } catch (error) {
    console.error("Error in getCategories:", error)
    return []
  }
}

export default async function RecipesPage() {
  const [recipes, categories] = await Promise.all([getRecipes(), getCategories()])

  return <RecipesPageClient initialRecipes={recipes} categories={categories} />
}
