import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  try {
    console.log("Fetching recipes...")
    const supabase = createClient()

    // Get recipes with basic info
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select(`
        id,
        name,
        description,
        ingredients,
        preparation,
        prep_time,
        cook_time,
        servings,
        difficulty,
        image_url,
        source_url,
        video_url,
        calories,
        created_at,
        updated_at,
        user_id
      `)
      .order("name", { ascending: true })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return { recipes: [], categories: [] }
    }

    // Get user profiles separately
    const userIds = [...new Set(recipes?.map((r) => r.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, alias, avatar_url")
      .in("id", userIds)

    // Get categories separately
    const { data: categories } = await supabase.from("categories").select("id, name").order("name", { ascending: true })

    // Get recipe categories separately
    const recipeIds = recipes?.map((r) => r.id) || []
    const { data: recipeCategories } = await supabase
      .from("recipe_categories")
      .select("recipe_id, category_id")
      .in("recipe_id", recipeIds)

    // Combine the data
    const recipesWithProfiles =
      recipes?.map((recipe) => {
        const profile = profiles?.find((p) => p.id === recipe.user_id)
        const recipeCats = recipeCategories?.filter((rc) => rc.recipe_id === recipe.id) || []
        const recipeCategs = recipeCats.map((rc) => categories?.find((c) => c.id === rc.category_id)).filter(Boolean)

        return {
          ...recipe,
          user_profiles: profile,
          recipe_categories: recipeCategs.map((cat) => ({ categories: cat })),
        }
      }) || []

    console.log(`Fetched ${recipesWithProfiles.length} recipes`)
    return {
      recipes: recipesWithProfiles,
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
