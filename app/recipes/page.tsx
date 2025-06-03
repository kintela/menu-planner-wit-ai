import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import Link from "next/link"
import { Plus } from "lucide-react"

interface CategoryWithCount {
  id: number
  name: string
  recipeCount: number
}

// Función para esperar un tiempo
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getRecipesAndCategories = async () => {
  const supabase = createServerComponentClient({ cookies })

  // Datos de fallback en caso de error
  let fallbackRecipes: any[] = []
  let fallbackCategories: any[] = []

  try {
    console.log("Intentando cargar datos con delays para evitar rate limiting...")

    // Intentar cargar recetas con múltiples intentos y delays
    let recipes: any[] = []
    let recipesError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Esperar un tiempo creciente entre intentos
        if (attempt > 0) {
          const delay = 1000 * Math.pow(2, attempt - 1)
          console.log(`Esperando ${delay}ms antes del intento ${attempt + 1} para recetas...`)
          await wait(delay)
        }

        const { data, error } = await supabase
          .from("recipes")
          .select(`
            *,
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

        if (error) throw error

        recipes = data || []
        console.log(`✅ Recetas cargadas correctamente: ${recipes.length}`)
        recipesError = null
        break
      } catch (error: any) {
        recipesError = error
        console.error(`❌ Error en intento ${attempt + 1} para recetas:`, error)

        // Guardar algunas recetas básicas como fallback
        try {
          const { data } = await supabase
            .from("recipes")
            .select("id, name, ingredients, preparation, image_url, user_id")
            .limit(10)

          if (data && data.length > 0) {
            fallbackRecipes = data
            console.log(`📋 Guardadas ${data.length} recetas básicas como fallback`)
          }
        } catch (fallbackError) {
          console.error("No se pudieron cargar recetas de fallback:", fallbackError)
        }
      }
    }

    // Si después de todos los intentos hay error, usar fallback
    if (recipesError) {
      console.warn("⚠️ Usando recetas de fallback después de múltiples intentos")
      recipes = fallbackRecipes
    }

    // Esperar antes de la siguiente consulta
    await wait(500)

    // Intentar cargar categorías
    let categoriesData: any[] = []
    let categoriesError = null

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          const delay = 1000 * Math.pow(2, attempt - 1)
          console.log(`Esperando ${delay}ms antes del intento ${attempt + 1} para categorías...`)
          await wait(delay)
        }

        const { data, error } = await supabase.from("categories").select("id, name").order("name")

        if (error) throw error

        categoriesData = data || []
        console.log(`✅ Categorías cargadas correctamente: ${categoriesData.length}`)
        categoriesError = null
        break
      } catch (error) {
        categoriesError = error
        console.error(`❌ Error en intento ${attempt + 1} para categorías:`, error)

        // Intentar cargar categorías básicas como fallback
        try {
          const { data } = await supabase.from("categories").select("id, name").limit(5)

          if (data && data.length > 0) {
            fallbackCategories = data
            console.log(`📋 Guardadas ${data.length} categorías básicas como fallback`)
          }
        } catch (fallbackError) {
          console.error("No se pudieron cargar categorías de fallback:", fallbackError)
        }
      }
    }

    // Si después de todos los intentos hay error, usar fallback
    if (categoriesError) {
      console.warn("⚠️ Usando categorías de fallback después de múltiples intentos")
      categoriesData = fallbackCategories
    }

    // Esperar antes de la siguiente consulta
    await wait(500)

    // Intentar cargar relaciones receta-categoría
    let recipeCategories: any[] = []

    try {
      const { data, error } = await supabase
        .from("recipe_categories")
        .select(`
          recipe_id,
          category_id,
          categories (
            id,
            name
          )
        `)
        .limit(100) // Limitar para evitar rate limiting

      if (error) {
        console.warn("⚠️ Error al cargar relaciones receta-categoría:", error)
      } else {
        recipeCategories = data || []
        console.log(`✅ Relaciones receta-categoría cargadas: ${recipeCategories.length}`)
      }
    } catch (error) {
      console.warn("⚠️ Error al cargar relaciones receta-categoría:", error)
    }

    // Crear un mapa de recetas a categorías
    const recipeToCategories: { [key: number]: any[] } = {}
    recipeCategories.forEach((rc) => {
      if (!recipeToCategories[rc.recipe_id]) {
        recipeToCategories[rc.recipe_id] = []
      }
      if (rc.categories) {
        recipeToCategories[rc.recipe_id].push(rc.categories)
      }
    })

    // Enriquecer las recetas con sus categorías
    const enrichedRecipes = recipes.map((recipe) => ({
      ...recipe,
      categories: recipeToCategories[recipe.id] || [],
    }))

    // Calcular el conteo de recetas por categoría
    const categories: CategoryWithCount[] = categoriesData.map((category) => {
      const recipeCount = enrichedRecipes.filter((recipe) =>
        recipe.categories.some((cat: any) => cat.id === category.id),
      ).length

      return {
        id: category.id,
        name: category.name,
        recipeCount,
      }
    })

    console.log("✅ Datos cargados correctamente:", {
      recipesCount: enrichedRecipes.length,
      categoriesCount: categories.length,
    })

    return {
      recipes: enrichedRecipes,
      categories,
      totalRecipesCount: enrichedRecipes.length,
    }
  } catch (error) {
    console.error("❌ Error general en getRecipesAndCategories:", error)

    // Devolver lo que tengamos, incluso si es incompleto
    return {
      recipes: fallbackRecipes.map((recipe) => ({ ...recipe, categories: [] })),
      categories: fallbackCategories.map((category) => ({
        ...category,
        recipeCount: 0,
      })),
      totalRecipesCount: fallbackRecipes.length,
    }
  }
}

interface RecipesPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const Recipes = async ({ searchParams }: RecipesPageProps) => {
  const { recipes, categories, totalRecipesCount } = await getRecipesAndCategories()

  // Verificar si hay filtros activos
  const hasActiveFilters = !!(searchParams.search || searchParams.categories || searchParams.my)
  const showOnlyMyRecipes = searchParams.my === "true"

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-3xl font-bold">Recetas</h1>
        <Link
          href="/recipes/add"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir Receta
        </Link>
      </div>

      {/* Mostrar mensaje si hay problemas con los datos */}
      {recipes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            {categories.length === 0
              ? "Hubo un problema cargando los datos. Por favor, intenta recargar la página."
              : "No hay recetas disponibles en el sistema."}
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/recipes" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Recargar
            </Link>
            <Link href="/recipes/add" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Añadir Receta
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mostrar advertencia si no se pudieron cargar las categorías */}
          {categories.length === 0 && recipes.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800">
                ⚠️ Las categorías no se pudieron cargar completamente. Los filtros pueden no funcionar correctamente.
              </p>
            </div>
          )}

          {/* Filtros de búsqueda */}
          <div className="mb-6">
            <RecipeSearch categories={categories} />
          </div>

          {/* Resultados filtrados */}
          <RecipesClientFilter
            recipes={recipes}
            showOnlyMyRecipes={showOnlyMyRecipes}
            hasActiveFilters={hasActiveFilters}
            totalRecipesCount={totalRecipesCount}
            searchParams={searchParams}
          />
        </>
      )}
    </div>
  )
}

export default Recipes
