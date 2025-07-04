import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"
import type { Recipe, Category } from "@/lib/types"

async function getRecipes(): Promise<Recipe[]> {
  try {
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
      return []
    }

    // Get user profiles for all unique user IDs
    const userIds = [...new Set(recipes.map((recipe) => recipe.user_id).filter(Boolean))]
    const { data: profiles } = await supabase.from("user_profiles").select("*").in("id", userIds)

    // Get categories for all recipes
    const recipeIds = recipes.map((recipe) => recipe.id)
    const { data: recipeCategories } = await supabase
      .from("recipe_categories")
      .select(
        `
        recipe_id,
        categories (
          id,
          name
        )
      `,
      )
      .in("recipe_id", recipeIds)

    // Combine the data
    const recipesWithDetails = recipes.map((recipe) => {
      // Find user profile
      const userProfile = profiles?.find((profile) => profile.id === recipe.user_id)

      // Find categories for this recipe
      const recipeCategs = recipeCategories?.filter((rc) => rc.recipe_id === recipe.id) || []
      const categories = recipeCategs.map((rc) => rc.categories).filter(Boolean)

      return {
        ...recipe,
        user_profiles: userProfile || null,
        categories: categories,
      }
    })

    return recipesWithDetails
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
