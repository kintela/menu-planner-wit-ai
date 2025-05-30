import EditRecipeForm from "@/components/recipes/EditRecipeForm"
import { getRecipeById } from "@/lib/recipes"

interface Params {
  id: string
}

interface PageProps {
  params: Params
}

const RecipeEditPage = async ({ params }: PageProps) => {
  const { id } = params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return <div>Recipe not found</div>
  }

  return (
    <div>
      <EditRecipeForm recipe={recipe} />
    </div>
  )
}

export default RecipeEditPage
