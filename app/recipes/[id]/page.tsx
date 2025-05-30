// app/recipes/[id]/page.tsx

import { createServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

interface Recipe {
  id: string
  created_at: string
  title: string
  ingredients: string[]
  instructions: string[]
  image: string
}

async function getRecipe(id: string): Promise<Recipe> {
  try {
    const supabase = createServerClient()

    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    if (error || !recipe) {
      return notFound()
    }

    return recipe
  } catch (error) {
    console.error("Error fetching recipe:", error)
    notFound()
  }
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  const { id } = params
  const recipe = await getRecipe(id)

  return (
    <div>
      <h1>{recipe?.title}</h1>
      <img src={recipe?.image || "/placeholder.svg"} alt={recipe?.title} />
      <h2>Ingredients:</h2>
      <ul>
        {recipe?.ingredients.map((ingredient, index) => (
          <li key={index}>{ingredient}</li>
        ))}
      </ul>
      <h2>Instructions:</h2>
      <ol>
        {recipe?.instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ol>
    </div>
  )
}
