import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"
import type { Recipe, Category } from "@/lib/types"

async function getRecipes(): Promise<Recipe[]> {
  try {
    const supabase = createClient()

    // Obtener recetas básicas ordenadas alfabéticamente
    const { data: recipes, error } = await supabase.from("recipes").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching recipes:", error)
      return []
    }

    if (!recipes || recipes.length === 0) {
      return []
    }

    // Obtener perfiles de usuario para las recetas
    const userIds = [...new Set(recipes.map((recipe) => recipe.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, alias, avatar_url")
      .in("id", userIds)

    // Obtener categorías para las recetas
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

    // Combinar datos
    const recipesWithData = recipes.map((recipe) => ({
      ...recipe,
      user_profiles: profiles?.find((profile) => profile.id === recipe.user_id) || null,
      categories:
        recipeCategories
          ?.filter((rc) => rc.recipe_id === recipe.id)
          ?.map((rc) => rc.categories)
          ?.filter(Boolean) || [],
    }))

    return recipesWithData
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
