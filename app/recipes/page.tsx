import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

export default async function RecipesPage() {
  const supabase = createClient()

  try {
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        *,
        categories:recipe_categories(
          category:categories(*)
        ),
        user_profiles!recipes_user_id_fkey(
          id,
          email,
          full_name,
          first_name,
          last_name,
          alias,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching recipes:", error)
      return <RecipesPageClient initialRecipes={[]} />
    }

    // Transform the data to match the expected format
    const transformedRecipes =
      recipes?.map((recipe) => ({
        ...recipe,
        categories: recipe.categories?.map((rc) => rc.category).filter(Boolean) || [],
        creator: recipe.user_profiles,
      })) || []

    return <RecipesPageClient initialRecipes={transformedRecipes} />
  } catch (error) {
    console.error("Error in RecipesPage:", error)
    return <RecipesPageClient initialRecipes={[]} />
  }
}
