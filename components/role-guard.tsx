"use client"

import type React from "react"

import { useUserProfile } from "@/hooks/use-user-profile"
import { useAuth } from "@/components/auth/auth-provider"
import { getPermissionsByRole } from "@/lib/auth"
import type { UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredPermission?: string
  fallback?: React.ReactNode
}

export function RoleGuard({ children, requiredRole, requiredPermission, fallback }: RoleGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  // Mostrar loading mientras se cargan los datos
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, redirigir al login (esto debería manejarse en el middleware)
  if (!user) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="h-5 w-5" />
            Acceso Denegado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Necesitas iniciar sesión para acceder a esta página.</p>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Si no hay perfil, mostrar error
  if (!profile) {
    return (
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="h-5 w-5" />
            Error de Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            No se pudo cargar tu perfil de usuario. Contacta con el administrador.
          </p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Inicio
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Verificar rol específico
  if (requiredRole && profile.role !== requiredRole) {
    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Shield className="h-5 w-5" />
              Permisos Insuficientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No tienes permisos para acceder a esta página. Se requiere el rol: <strong>{requiredRole}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Tu rol actual: <strong>{profile.role}</strong>
            </p>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Link>
            </Button>
          </CardContent>
        </Card>
      )
    )
  }

  // Verificar permiso específico
  if (requiredPermission) {
    const userPermissions = getPermissionsByRole(profile.role)
    if (!userPermissions.includes(requiredPermission)) {
      return (
        fallback || (
          <Card className="max-w-md mx-auto mt-10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Shield className="h-5 w-5" />
                Permisos Insuficientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">No tienes permisos para realizar esta acción.</p>
              <p className="text-sm text-muted-foreground mb-4">
                Permiso requerido: <strong>{requiredPermission}</strong>
              </p>
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Inicio
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      )
    }
  }

  // Si pasa todas las verificaciones, mostrar el contenido
  return <>{children}</>
}
