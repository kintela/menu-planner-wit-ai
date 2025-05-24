import { createServerClient } from "@/lib/supabase/server"
import { CategoryManager } from "@/components/category-manager"
import type { Category } from "@/lib/types"

interface CategoryWithCount extends Category {
  recipe_count: number
}

// Forzar renderizado dinámico
export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const supabase = createServerClient()

  // Obtener todas las categorías con el conteo de recetas asociadas
  const { data: categoriesWithCount, error } = await supabase
    .from("categories")
    .select(`
      *,
      recipe_count:recipe_categories(count)
    `)
    .order("name")

  if (error) {
    console.error("Error fetching categories:", error)
  }

  // Formatear los datos para que sean más fáciles de usar
  const formattedCategories = categoriesWithCount?.map((category: any) => ({
    ...category,
    recipe_count: category.recipe_count[0]?.count || 0,
  })) as CategoryWithCount[]

  // Agrupar categorías con nombres similares (ignorando mayúsculas/minúsculas)
  const categoriesByName: Record<string, CategoryWithCount[]> = {}
  formattedCategories?.forEach((category) => {
    const lowerName = category.name.toLowerCase()
    if (!categoriesByName[lowerName]) {
      categoriesByName[lowerName] = []
    }
    categoriesByName[lowerName].push(category)
  })

  // Identificar categorías duplicadas
  const duplicateCategories = Object.entries(categoriesByName)
    .filter(([_, categories]) => categories.length > 1)
    .map(([name, categories]) => ({
      name,
      categories,
    }))

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Gestión de Categorías</h1>
      <CategoryManager categories={formattedCategories || []} duplicateCategories={duplicateCategories} />
    </div>
  )
}
