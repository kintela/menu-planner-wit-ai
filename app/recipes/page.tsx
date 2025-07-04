import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  const supabase = createClient()

  try {
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
          first_name,
          last_name,
          alias,
          avatar_url
        ),
        recipe_categories (
          categories (
            id,
            name
          )
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching recipes:", error)
      return []
    }

    return recipes || []
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
