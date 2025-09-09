"use server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createServerClient } from "@/lib/supabase/server"
import { Clock, Star, ChefHat, Calendar } from "lucide-react"
import { ClientOnlyDate } from "@/components/ui/client-only-date"

interface RecentActivityProps {
  userId: string
}

export async function RecentActivity({ userId }: RecentActivityProps) {
  const supabase = createServerClient()

  // Obtener actividad reciente del usuario
  const [recentRecipes, recentRatings, recentMenus] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),

    supabase
      .from("recipe_ratings")
      .select(`
        rating,
        created_at,
        recipes (name)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),

    supabase
      .from("weekly_menus")
      .select("id, name, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2),
  ])

  const activities = [
    ...(recentRecipes.data?.map((recipe) => ({
      type: "recipe" as const,
      title: `Nueva receta: ${recipe.name}`,
      time: recipe.created_at,
      icon: ChefHat,
    })) || []),

    ...(recentRatings.data?.map((rating) => {
      const recipeName = Array.isArray(rating.recipes)
        ? rating.recipes[0]?.name
        : (rating as any).recipes?.name
      return {
        type: "rating" as const,
        title: `Valoraste: ${recipeName || 'Receta'}`,
        time: rating.created_at,
        rating: rating.rating,
        icon: Star,
      }
    }) || []),

    ...(recentMenus.data?.map((menu) => ({
      type: "menu" as const,
      title: `Nuevo menú: ${menu.name}`,
      time: menu.created_at,
      icon: Calendar,
    })) || []),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = activity.icon
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        <ClientOnlyDate date={activity.time} />
                      </p>
                      {activity.type === "rating" && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.rating}⭐
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
