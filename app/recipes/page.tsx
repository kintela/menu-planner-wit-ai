import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { RecipesPageClient } from "@/components/recipes-page-client"

async function getRecipes() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore)

  try {
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        *,
        user_profiles (
          id,
          email,
          full_name,
          first_name,
          last_name,
          alias,
          avatar_url
        ),
        recipe_categories (
          categories (
            id,
            name
          )
        ),
        menu_items (
          weekly_menu_id
        )
      `)
      .order("name", { ascending: true })

    if (error) {
      console.error("[getRecipes] Error consulta compleja:", error)
      // Fallback mínimo para diagnosticar si el problema es por relaciones / RLS
      const { data: simpleData, error: simpleError } = await supabase.from("recipes").select("id,name").limit(10)
      if (simpleError) {
        console.error("[getRecipes] Error en fallback simple:", simpleError)
      } else {
        console.log("[getRecipes] Fallback simple devolvió", simpleData?.length, "filas")
      }
      return []
    }

    if (!recipes || recipes.length === 0) {
      console.warn("[getRecipes] Consulta compleja devolvió 0 filas. Probando probe simple para verificar acceso.")
      const { data: probe, error: probeError, count } = await supabase
        .from("recipes")
        .select("id", { count: "exact" })
        .limit(1)
      if (probeError) {
        console.error("[getRecipes] Probe simple error:", probeError)
      } else {
        console.log("[getRecipes] Probe simple count (estimado):", count, "primer id:", probe?.[0]?.id)
      }
    }

    // Transformar menu_items a menu_ids para cada receta
    const recipesWithMenuIds = (recipes || []).map(r => ({
      ...r,
      menu_ids: Array.isArray(r.menu_items)
        ? r.menu_items
            .map(mi => mi?.weekly_menu_id)
            .filter(id => typeof id === "number" && !isNaN(id))
        : [],
    }));

    return recipesWithMenuIds
  } catch (error) {
    console.error("[getRecipes] Excepción inesperada:", error)
    try {
      const cookieStore2 = await cookies();
      const supabase2 = createClient(cookieStore2)
      const { data: simpleData2, error: simpleError2 } = await supabase2.from("recipes").select("id,name").limit(5)
      if (simpleError2) {
        console.error("[getRecipes] Error segundo fallback:", simpleError2)
      } else {
        console.log("[getRecipes] Segundo fallback devolvió", simpleData2?.length, "filas")
      }
    } catch {}
    return []
  }
}

async function getCategories() {
  const cookieStore2 = await cookies();
  const supabase2 = createClient(cookieStore2)

  try {
    const { data: categories, error } = await supabase2.from("categories").select("*").order("name")

    if (error) {
      return []
    }

    return categories || []
  } catch (error) {
    return []
  }
}

export default async function RecipesPage() {
  try {
    const [recipes, categories] = await Promise.all([getRecipes(), getCategories()])

    return <RecipesPageClient initialRecipes={recipes} initialCategories={categories} />
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600">Hubo un error al cargar las recetas. Por favor, intenta de nuevo.</p>
        </div>
      </div>
    )
  }
}
