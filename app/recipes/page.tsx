import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import RecipeCard from "@/components/RecipeCard"
import type { Recipe } from "@/types"

const getRecipes = async (): Promise<Recipe[]> => {
  const supabase = createServerComponentClient({ cookies })

  // En lugar de solo obtener user_profiles básico, obtener todos los campos necesarios
  const { data: recipes, error } = await supabase
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

  if (error) {
    console.log(error)
  }

  return (recipes as any) || []
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
