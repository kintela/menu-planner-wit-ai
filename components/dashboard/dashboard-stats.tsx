import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Star, Calendar, Zap } from "lucide-react"
import type { UserRole } from "@/lib/types"

interface DashboardStatsProps {
  stats: {
    recipes: number
    ratings: number
    weeklyMenus: number
    aiUsageToday: number
  }
  userRole: UserRole
}

export function DashboardStats({ stats, userRole }: DashboardStatsProps) {
  const canCreateContent = userRole !== "user_restricted"

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mis Recetas</CardTitle>
          <ChefHat className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.recipes}</div>
          {!canCreateContent && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Solo lectura
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valoraciones</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.ratings}</div>
          <p className="text-xs text-muted-foreground">Recetas valoradas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Menús Semanales</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.weeklyMenus}</div>
          {!canCreateContent && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Solo lectura
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">IA Hoy</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.aiUsageToday}</div>
          <p className="text-xs text-muted-foreground">Sugerencias usadas</p>
        </CardContent>
      </Card>
    </div>
  )
}
