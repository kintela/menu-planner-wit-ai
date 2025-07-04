import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  const supabase = createClient()

  try {
    // Primero obtener las recetas básicas
    const { data: recipes, error } = await supabase.from("recipes").select("*").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching recipes:", error)
      return []
    }

    if (!recipes || recipes.length === 0) {
      return []
    }

    // Obtener los perfiles de usuario por separado
    const userIds = [...new Set(recipes.map((recipe) => recipe.user_id).filter(Boolean))]
    let userProfiles = []

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, first_name, last_name, alias, avatar_url")
        .in("id", userIds)

      userProfiles = profiles || []
    }

    // Obtener las categorías de las recetas por separado
    const recipeIds = recipes.map((recipe) => recipe.id)
    let recipeCategories = []

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
    const recipesWithData = recipes.map((recipe) => ({
      ...recipe,
      user_profiles: userProfiles.find((profile) => profile.id === recipe.user_id) || null,
      recipe_categories: recipeCategories
        .filter((rc) => rc.recipe_id === recipe.id)
        .map((rc) => ({ categories: rc.categories })),
    }))

    return recipesWithData
  } catch (error) {
    console.error("Error fetching recipes:", error)
    return []
  }
}

async function getCategories() {
  const supabase = createClient()

  try {
    const { data: categories, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      return []
    }

    return categories || []
  } catch (error) {
    console.error("Error fetching categories:", error)
    return []
  }
}

export default async function RecipesPage() {
  const [recipes, categories] = await Promise.all([getRecipes(), getCategories()])

  return (
    <div className="container mx-auto px-4 py-8">
      <RecipesPageClient initialRecipes={recipes} initialCategories={categories} />
    </div>
  )
}
