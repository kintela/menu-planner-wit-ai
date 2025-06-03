import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { redirect } from "next/navigation"

import { RecipeSearch } from "@/components/recipe-search"
import { RecipeCard } from "@/components/recipe-card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

import type { Recipe } from "@/lib/types"

// Función para obtener recetas y categorías
async function getRecipesAndCategories(searchParams: { search?: string; categories?: string }) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  try {
    // Obtener categorías con conteo de recetas
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return { recipes: [], categories: [] }
    }

    // Construir la consulta base para recetas
    let query = supabase.from("recipes").select("*")

    // Aplicar filtro de búsqueda si existe
    if (searchParams.search) {
      query = query.or(`name.ilike.%${searchParams.search}%,ingredients.ilike.%${searchParams.search}%`)
    }

    // Aplicar filtro de categorías si existe
    if (searchParams.categories) {
      const categoryIds = searchParams.categories
        .split(",")
        .map((id) => Number.parseInt(id.trim()))
        .filter((id) => !isNaN(id))

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds)
      }
    }

    // Ejecutar la consulta
    const { data: recipes, error: recipesError } = await query.order("created_at", {
      ascending: false,
    })

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
      return { recipes: [], categories }
    }

    // Contar recetas por categoría
    const categoriesWithCount = categories.map((category) => ({
      ...category,
      recipeCount: recipes.filter((recipe) => recipe.category_id === category.id).length,
    }))

    return { recipes, categories: categoriesWithCount }
  } catch (error) {
    console.error("Error in getRecipesAndCategories:", error)
    return { recipes: [], categories: [] }
  }
}

export default async function Recipes({
  searchParams,
}: {
  searchParams: { search?: string; categories?: string }
}) {
  // Limpiar la URL si hay parámetros pero no hay filtros activos
  if (
    searchParams.categories === "" ||
    searchParams.categories === "0" ||
    searchParams.categories === "undefined" ||
    (searchParams.categories && !searchParams.categories.match(/^\d+(,\d+)*$/))
  ) {
    redirect("/recipes")
  }

  try {
    const { recipes, categories } = await getRecipesAndCategories(searchParams)

    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Recetas</h1>
          <Link href="/recipes/add">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" /> Añadir Receta
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <RecipeSearch categories={categories} />
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Mostrando {recipes.length} recetas de {recipes.length} en total
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: Recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    )
  } catch (error) {
    console.error("❌ Error en fallback de recetas:", error)
    return (
      <div className="container py-8">
        <h1 className="text-4xl font-bold mb-8">Recetas</h1>
        <p className="text-red-500">Error al cargar las recetas. Por favor, inténtalo de nuevo más tarde.</p>
      </div>
    )
  }
}
