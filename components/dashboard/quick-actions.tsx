import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Search, Settings, Sparkles } from "lucide-react"
import Link from "next/link"
import type { UserRole } from "@/lib/types"

interface QuickActionsProps {
  userRole: UserRole
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const canCreate = userRole !== "user_restricted"
  const canManage = userRole === "admin"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canCreate && (
          <>
            <Button asChild className="w-full">
              <Link href="/recipes/add">Nueva Receta</Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/weekly-menu">
                <Calendar className="mr-2 h-4 w-4" />
                Crear Menú Semanal
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/recipes/search?ai=true">
                <Sparkles className="mr-2 h-4 w-4" />
                Sugerencias IA
              </Link>
            </Button>
          </>
        )}

        <Button asChild variant="outline" className="w-full justify-start bg-transparent">
          <Link href="/recipes/search">
            <Search className="mr-2 h-4 w-4" />
            Buscar Recetas
          </Link>
        </Button>

        {canManage && (
          <Button asChild variant="outline" className="w-full justify-start bg-transparent">
            <Link href="/admin/users">
              <Settings className="mr-2 h-4 w-4" />
              Gestionar Usuarios
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
