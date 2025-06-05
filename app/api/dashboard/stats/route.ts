import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const profile = await getCurrentUserProfile()

    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const supabase = createServerClient()

    // Obtener estadísticas detalladas
    const [recipesStats, ratingsStats, menuStats, aiUsageStats, categoryStats] = await Promise.all([
      // Estadísticas de recetas
      supabase
        .from("recipes")
        .select("id, created_at, calories")
        .eq("user_id", profile.id),

      // Estadísticas de valoraciones
      supabase
        .from("recipe_ratings")
        .select("rating, created_at")
        .eq("user_id", profile.id),

      // Estadísticas de menús
      supabase
        .from("weekly_menus")
        .select("id, created_at")
        .eq("user_id", profile.id),

      // Uso de IA
      supabase
        .from("ai_usage_tracking")
        .select("usage_count, usage_date")
        .eq("user_id", profile.id)
        .gte("usage_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),

      // Categorías más usadas
      supabase
        .from("recipe_categories")
        .select(`
          categories (name),
          recipes!inner (user_id)
        `)
        .eq("recipes.user_id", profile.id),
    ])

    const stats = {
      recipes: {
        total: recipesStats.data?.length || 0,
        thisMonth:
          recipesStats.data?.filter((r) => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .length || 0,
        avgCalories:
          recipesStats.data?.reduce((sum, r) => sum + (r.calories || 0), 0) / (recipesStats.data?.length || 1) || 0,
      },
      ratings: {
        total: ratingsStats.data?.length || 0,
        avgRating: ratingsStats.data?.reduce((sum, r) => sum + r.rating, 0) / (ratingsStats.data?.length || 1) || 0,
      },
      menus: {
        total: menuStats.data?.length || 0,
        thisMonth:
          menuStats.data?.filter((m) => new Date(m.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .length || 0,
      },
      aiUsage: {
        last30Days: aiUsageStats.data?.reduce((sum, usage) => sum + usage.usage_count, 0) || 0,
        today:
          aiUsageStats.data
            ?.filter((usage) => usage.usage_date === new Date().toISOString().split("T")[0])
            .reduce((sum, usage) => sum + usage.usage_count, 0) || 0,
      },
      topCategories:
        categoryStats.data?.reduce((acc: Record<string, number>, item) => {
          const categoryName = item.categories?.name
          if (categoryName) {
            acc[categoryName] = (acc[categoryName] || 0) + 1
          }
          return acc
        }, {}) || {},
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error getting dashboard stats:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
