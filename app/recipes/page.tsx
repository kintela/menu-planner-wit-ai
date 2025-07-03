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
      return { recipes: [], categories: [], userProfiles: [] }
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }

    // Get user profiles for recipe creators
    const userIds = [...new Set(recipes?.map((recipe) => recipe.user_id).filter(Boolean))] as string[]
    let userProfiles: any[] = []

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("id, full_name, first_name, last_name, alias, avatar_url, email")
        .in("id", userIds)

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError)
      } else {
        userProfiles = profiles || []
      }
    }

    // Get recipe categories relationships
    const recipeIds = recipes?.map((recipe) => recipe.id) || []
    let recipeCategories: any[] = []

    if (recipeIds.length > 0) {
      const { data: recipeCats, error: recipeCatsError } = await supabase
        .from("recipe_categories")
        .select("recipe_id, category_id")
        .in("recipe_id", recipeIds)

      if (recipeCatsError) {
        console.error("Error fetching recipe categories:", recipeCatsError)
      } else {
        recipeCategories = recipeCats || []
      }
    }

    // Enrich recipes with user profiles and categories
    const enrichedRecipes =
      recipes?.map((recipe) => {
        const userProfile = userProfiles.find((profile) => profile.id === recipe.user_id)
        const recipeCategoryIds = recipeCategories
          .filter((rc) => rc.recipe_id === recipe.id)
          .map((rc) => rc.category_id)
        const recipeCategories_data = categories?.filter((cat) => recipeCategoryIds.includes(cat.id)) || []

        return {
          ...recipe,
          user_profiles: userProfile,
          recipe_categories: recipeCategories_data.map((cat) => ({ categories: cat })),
        }
      }) || []

    return {
      recipes: enrichedRecipes,
      categories: categories || [],
      userProfiles,
    }
  } catch (error) {
    console.error("Error in getRecipes:", error)
    return { recipes: [], categories: [], userProfiles: [] }
  }
}

export default async function RecipesPage() {
  const { recipes, categories, userProfiles } = await getRecipes()

  return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} userProfiles={userProfiles} />
}
