import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

export default async function RecipesPage() {
  const supabase = createClient()

  try {
    // Fetch recipes
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return <RecipesPageClient initialRecipes={[]} initialCategories={[]} />
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }

    // Fetch user profiles for recipe creators
    const userIds = [...new Set(recipes?.map((recipe) => recipe.user_id) || [])]
    const { data: userProfiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, full_name, first_name, last_name, alias, avatar_url")
      .in("id", userIds)

    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError)
    }

    // Fetch recipe categories relationships
    const recipeIds = recipes?.map((recipe) => recipe.id) || []
    const { data: recipeCategories, error: recipeCategoriesError } = await supabase
      .from("recipe_categories")
      .select("recipe_id, category_id")
      .in("recipe_id", recipeIds)

    if (recipeCategoriesError) {
      console.error("Error fetching recipe categories:", recipeCategoriesError)
    }

    // Combine the data
    const enrichedRecipes =
      recipes?.map((recipe) => {
        const creator = userProfiles?.find((profile) => profile.id === recipe.user_id)
        const recipeCategoryIds =
          recipeCategories?.filter((rc) => rc.recipe_id === recipe.id).map((rc) => rc.category_id) || []
        const recipeCategories_data = categories?.filter((cat) => recipeCategoryIds.includes(cat.id)) || []

        return {
          ...recipe,
          user_profiles: creator,
          recipe_categories: recipeCategories_data.map((cat) => ({ categories: cat })),
        }
      }) || []

    return <RecipesPageClient initialRecipes={enrichedRecipes} initialCategories={categories || []} />
  } catch (error) {
    console.error("Error in RecipesPage:", error)
    return <RecipesPageClient initialRecipes={[]} initialCategories={[]} />
  }
}
