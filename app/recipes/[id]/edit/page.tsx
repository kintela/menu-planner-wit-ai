"use client"

import { useEffect, useState } from "react"
import { useParams, notFound } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { EditRecipeForm } from "@/components/edit-recipe-form"
import type { Category, Recipe } from "@/lib/types"
import { Loader2 } from "lucide-react"

export default function EditRecipePage() {
  const params = useParams()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabaseClient()

        // Obtener la receta
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select("*")
          .eq("id", params.id)
          .single()

        if (recipeError || !recipeData) {
          setError("Receta no encontrada")
          return
        }

        setRecipe(recipeData)

        // Obtener las categorías de la receta
        const { data: recipeCategories } = await supabase
          .from("recipe_categories")
          .select("category_id")
          .eq("recipe_id", recipeData.id)

        const categoryIds = recipeCategories?.map((rc) => rc.category_id) || []
        setSelectedCategoryIds(categoryIds)

        // Obtener todas las categorías
        const { data: categoriesData } = await supabase.from("categories").select("*").order("name")

        setCategories(categoriesData || [])

        console.log("Recipe loaded:", recipeData)
        console.log("Selected Category IDs:", categoryIds)
        console.log("All Categories:", categoriesData)
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadData()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando receta...</span>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    notFound()
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Editar Receta</h1>
      <EditRecipeForm recipe={recipe} categories={categories} selectedCategoryIds={selectedCategoryIds} />
    </div>
  )
}
