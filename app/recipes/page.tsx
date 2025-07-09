import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { RecipesPageClient } from "@/components/recipes-page-client"

export default async function RecipesPage() {
  const supabase = createClient()

  // Fetch recipes with user profiles and categories
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
      ),
      recipe_categories (
        categories (
          id,
          name
        )
      )
    `)
    .order("created_at", { ascending: false })

  // Fetch categories for filtering
  const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

  if (recipesError) {
    console.error("Error fetching recipes:", recipesError)
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Recetas</h1>
        <div className="text-red-600">Error al cargar las recetas: {recipesError.message}</div>
      </div>
    )
  }

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Cargando recetas...</div>}>
        <RecipesPageClient initialRecipes={recipes || []} categories={categories || []} />
      </Suspense>
    </div>
  )
}
