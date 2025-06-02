import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import RecipeCard from "@/components/RecipeCard"
import type { Recipe } from "@/types"

const getRecipes = async (): Promise<Recipe[]> => {
  const supabase = createServerComponentClient({ cookies })

  // Cambiar la consulta actual por esta más específica
  const { data: allRecipes, error: recipesError } = await supabase
    .from("recipes")
    .select(`
    *,
    categories (
      id,
      name
    ),
    user_profiles (
      id,
      full_name,
      email,
      alias,
      first_name,
      last_name,
      avatar_url
    )
  `)
    .order("created_at", { ascending: false })

  if (recipesError) {
    console.log(recipesError)
  }

  return (allRecipes as any) || []
}

const Recipes = async () => {
  const recipes = await getRecipes()

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Recipes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}

export default Recipes
