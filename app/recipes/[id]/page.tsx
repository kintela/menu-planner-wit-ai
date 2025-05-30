import { notFound } from "next/navigation"
import type { Recipe } from "@/types"
import Image from "next/image"

async function getRecipe(id: string): Promise<Recipe> {
  try {
    const res = await fetch(`http://localhost:3000/api/recipes/${id}`, {
      cache: "no-store",
    })

    if (!res.ok) {
      return notFound()
    }

    const recipe = await res.json()
    return recipe
  } catch (error) {
    console.error("Error fetching recipe:", error)
    notFound()
  }
}

export default async function RecipePage({ params }: { params: { id: string } }) {
  const recipe = await getRecipe(params.id)

  if (!recipe) {
    return notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{recipe.name}</h1>
      <p className="text-gray-600 mb-6">{recipe.description}</p>

      {recipe.image_url && (
        <div className="relative w-full aspect-video mb-6">
          <Image
            src={recipe.image_url || "/placeholder.svg"}
            alt={recipe.name}
            fill
            className="object-cover rounded-lg"
            onLoad={() => console.log("Image loaded successfully:", recipe.image_url)}
            onError={(e) => {
              console.error("Error loading image:", recipe.image_url)
              console.error("Image error event:", e)
            }}
          />
        </div>
      )}

      <h2 className="text-2xl font-bold mb-2">Ingredients:</h2>
      <ul className="list-disc list-inside mb-6">
        {recipe.ingredients.map((ingredient, index) => (
          <li key={index}>{ingredient}</li>
        ))}
      </ul>

      <h2 className="text-2xl font-bold mb-2">Instructions:</h2>
      <p className="text-gray-700">{recipe.instructions}</p>
    </div>
  )
}
