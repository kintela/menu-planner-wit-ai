import { AddRecipeForm } from "@/components/add-recipe-form"

async function getCategories() {
  // Simulate fetching categories from a database or API
  return [
    { id: 1, name: "Breakfast" },
    { id: 2, name: "Lunch" },
    { id: 3, name: "Dinner" },
    { id: 4, name: "Dessert" },
  ]
}

export default async function AddRecipePage() {
  const categories = await getCategories()

  return (
    <div>
      <h1>Add a New Recipe</h1>
      <AddRecipeForm categories={categories} />
    </div>
  )
}
