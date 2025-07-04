import { createServerClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"
import type { Recipe, Category } from "@/lib/types"

async function getRecipes(): Promise<Recipe[]> {
  const supabase = createServerClient()

  try {
    console.log("Fetching recipes...")

    // Primero obtener las recetas básicas
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return []
    }

    if (!recipes || recipes.length === 0) {
      console.log("No recipes found")
      return []
    }

    console.log(`Found ${recipes.length} recipes`)

    // Obtener información de usuarios para las recetas
    const userIds = [...new Set(recipes.map((recipe) => recipe.user_id).filter(Boolean))]
    let userProfiles: any[] = []

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, alias, avatar_url")
        .in("id", userIds)

      userProfiles = profiles || []
    }

    // Obtener categorías para las recetas
    const recipeIds = recipes.map((recipe) => recipe.id)
    let recipeCategories: any[] = []

    if (recipeIds.length > 0) {
      const { data: categories } = await supabase
        .from("recipe_categories")
        .select(`
          recipe_id,
          categories (
            id,
            name
          )
        `)
        .in("recipe_id", recipeIds)

      recipeCategories = categories || []
    }

    // Combinar los datos
    const recipesWithDetails = recipes.map((recipe) => {
      const userProfile = userProfiles.find((profile) => profile.id === recipe.user_id)
      const categories = recipeCategories
        .filter((rc) => rc.recipe_id === recipe.id)
        .map((rc) => rc.categories)
        .filter(Boolean)

      return {
        ...recipe,
        user_profiles: userProfile || null,
        categories: categories,
      }
    })

    console.log("Recipes with details prepared successfully")
    return recipesWithDetails as Recipe[]
  } catch (error) {
    console.error("Error in getRecipes:", error)
    return []
  }
}

async function getCategories(): Promise<Category[]> {
  const supabase = createServerClient()

  try {
    const { data: categories, error } = await supabase.from("categories").select("*").order("name")

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
