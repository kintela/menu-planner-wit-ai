import { createClient } from "@/lib/supabase/server"
import RecipesPageClient from "@/components/recipes-page-client"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  is_ai_generated: boolean | null
  video_url: string | null
  source_url: string | null
  calories: number | null
  created_at: string
  user_id: string | null
  category_id: number | null
}

interface Category {
  id: number
  name: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  alias: string | null
  avatar_url: string | null
}

async function getRecipesData() {
  try {
    const supabase = createClient()

    // Fetch recipes
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return { recipes: [], categories: [], userProfiles: [] }
    }

    // Fetch categories
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
    }

    // Fetch user profiles for recipes that have user_id
    const userIds = [...new Set(recipes?.filter((r) => r.user_id).map((r) => r.user_id))] as string[]
    let userProfiles: UserProfile[] = []

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, alias, avatar_url")
        .in("id", userIds)

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError)
      } else {
        userProfiles = profiles || []
      }
    }

    return {
      recipes: recipes || [],
      categories: categories || [],
      userProfiles,
    }
  } catch (error) {
    console.error("Error fetching recipes data:", error)
    return { recipes: [], categories: [], userProfiles: [] }
  }
}

export default async function RecipesPage() {
  const { recipes, categories, userProfiles } = await getRecipesData()

  return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} userProfiles={userProfiles} />
}
