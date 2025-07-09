import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import RecipesPageClient from "@/components/recipes-page-client"

export default async function RecipesPage() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    },
  )

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch recipes with categories and user info
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(`
      *,
      categories:recipe_categories(
        category:categories(*)
      ),
      user_profiles!recipes_user_id_fkey(
        display_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching recipes:", error)
    return <div>Error loading recipes</div>
  }

  // Fetch categories for filtering
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  return <RecipesPageClient initialRecipes={recipes || []} categories={categories || []} currentUser={user} />
}
