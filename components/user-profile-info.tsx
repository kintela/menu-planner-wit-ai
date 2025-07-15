"use client"

import { useUserProfile } from "@/hooks/use-user-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserRoleBadge } from "@/components/user-role-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Mail, Calendar, Shield } from "lucide-react"
import { getRoleDescription } from "@/lib/auth"
import { ClientOnlyDate } from "@/components/ui/client-only-date"

export function UserProfileInfo() {
  const { profile, loading, error } = useUserProfile()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (error || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <User className="h-5 w-5" />
            Error al cargar perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">No se pudo cargar la información del perfil.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información del Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{profile.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{profile.full_name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <UserRoleBadge role={profile.role} />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Miembro desde <ClientOnlyDate date={profile.created_at} />
            </span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm mb-2">Permisos del rol:</h4>
          <p className="text-xs text-muted-foreground">{getRoleDescription(profile.role)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
