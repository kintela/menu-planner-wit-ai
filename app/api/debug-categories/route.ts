import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  // 1. Obtener todas las categorías
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name")
    .order("name")

  if (categoriesError) {
    return NextResponse.json({ error: categoriesError.message }, { status: 500 })
  }

  // 2. Obtener la tabla de relación entre recetas y categorías
  const { data: recipeCategories, error: relationError } = await supabase.from("recipe_categories").select("*")

  if (relationError) {
    return NextResponse.json({ error: relationError.message }, { status: 500 })
  }

  // 3. Obtener todas las recetas
  const { data: recipes, error: recipesError } = await supabase.from("recipes").select("id, name, categories(*)")

  if (recipesError) {
    return NextResponse.json({ error: recipesError.message }, { status: 500 })
  }

  // 4. Contar recetas por categoría
  const categoryCounts = categories.map((category) => {
    // Contar usando la tabla de relación si existe
    let count = 0
    if (recipeCategories && recipeCategories.length > 0) {
      count = recipeCategories.filter((rc) => rc.category_id === category.id).length
    } else {
      // Intentar contar usando la relación en las recetas
      count = recipes.filter((recipe) => {
        if (Array.isArray(recipe.categories)) {
          return recipe.categories.some((cat) => cat.id === category.id)
        } else if (recipe.categories) {
          return recipe.categories.id === category.id
        }
        return false
      }).length
    }

    return {
      ...category,
      recipeCount: count,
    }
  })

  // 5. Devolver la estructura de la base de datos y los conteos
  return NextResponse.json({
    databaseStructure: {
      hasRecipeCategoriesTable: !!recipeCategories,
      sampleRecipe: recipes[0],
      sampleCategory: categories[0],
      sampleRelation: recipeCategories ? recipeCategories[0] : null,
    },
    categoryCounts,
    totalRecipes: recipes.length,
  })
}
