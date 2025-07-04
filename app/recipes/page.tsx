import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  try {
    const supabase = createClient()

    // Obtener recetas
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
          alias,
          avatar_url
        )
      `)
      .order("name", { ascending: true })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return { recipes: [], categories: [] }
    }

    // Obtener categorías con conteo
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select(`
        *,
        recipe_categories (
          recipe_id
        )
      `)
      .order("name", { ascending: true })

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return { recipes: recipes || [], categories: [] }
    }

    // Procesar categorías con conteo
    const categoriesWithCount =
      categories?.map((category) => ({
        ...category,
        recipe_count: category.recipe_categories?.length || 0,
      })) || []

    return {
      recipes: recipes || [],
      categories: categoriesWithCount,
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
