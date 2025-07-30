import { createServerClient } from "@/lib/supabase/server"
import { getCurrentUserProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { WeeklyMenuPreview } from "@/components/dashboard/weekly-menu-preview"
import { cookies } from 'next/headers'; // Importar cookies para inicializar cookieStore

export default async function DashboardPage() {
  const cookieStore = await cookies(); // Inicializar cookieStore
  const profile = await getCurrentUserProfile(cookieStore)

  if (!profile) {
    redirect("/login")
  }

  const supabase = createServerClient(cookieStore)

  // Obtener estadísticas del usuario
  const [recipesCount, ratingsCount, weeklyMenusCount, aiUsageCount] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact" }).eq("user_id", profile.id),
    supabase.from("recipe_ratings").select("id", { count: "exact" }).eq("user_id", profile.id),
    supabase.from("weekly_menus").select("id", { count: "exact" }).eq("user_id", profile.id),
    supabase
      .from("ai_usage_tracking")
      .select("usage_count")
      .eq("user_id", profile.id)
      .gte("usage_date", new Date().toISOString().split("T")[0]),
  ])

  const stats = {
    recipes: recipesCount.count || 0,
    ratings: ratingsCount.count || 0,
    weeklyMenus: weeklyMenusCount.count || 0,
    aiUsageToday: aiUsageCount.data?.reduce((sum, item) => sum + item.usage_count, 0) || 0,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Hola, {profile.first_name || profile.full_name || "Usuario"}!
        </h1>
        <p className="text-gray-600 mt-2">Bienvenido a tu panel de control del planificador de menús</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estadísticas principales */}
        <div className="lg:col-span-2">
          <DashboardStats stats={stats} userRole={profile.role} />
        </div>

        {/* Acciones rápidas */}
        <div>
          <QuickActions userRole={profile.role} />
        </div>

        {/* Vista previa del menú semanal */}
        <div className="lg:col-span-2">
          <WeeklyMenuPreview userId={profile.id} />
        </div>

        {/* Actividad reciente */}
        <div>
          <RecentActivity userId={profile.id} />
        </div>
      </div>
    </div>
  )
}
