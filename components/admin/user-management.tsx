"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { UserProfile, UserRole } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserRoleBadge } from "@/components/user-role-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getRoleDisplayName } from "@/lib/auth"
import { Users, Calendar, Mail } from "lucide-react"
import { ClientOnlyDate } from "@/components/ui/client-only-date"

interface UserManagementProps {
  users: UserProfile[]
  currentUserId: string
}

export function UserManagement({ users: initialUsers, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (userId === currentUserId) {
      toast({
        title: "Acción no permitida",
        description: "No puedes cambiar tu propio rol.",
        variant: "destructive",
      })
      return
    }

    setUpdatingUser(userId)

    try {
      const supabase = getSupabaseClient()

      const { error } = await supabase.from("user_profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      // Actualizar la lista local
      setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)))

      toast({
        title: "Rol actualizado",
        description: `El rol del usuario ha sido cambiado a ${getRoleDisplayName(newRole)}.`,
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario.",
        variant: "destructive",
      })
    } finally {
      setUpdatingUser(null)
    }
  }

  const getRoleStats = () => {
    const stats = {
      admin: users.filter((u) => u.role === "admin").length,
      user_full: users.filter((u) => u.role === "user_full").length,
      user_restricted: users.filter((u) => u.role === "user_restricted").length,
    }
    return stats
  }

  const stats = getRoleStats()

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Badge variant="destructive">{stats.admin}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admin}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Completos</CardTitle>
            <Badge variant="default">{stats.user_full}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.user_full}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Restringidos</CardTitle>
            <Badge variant="secondary">{stats.user_restricted}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.user_restricted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                    {user.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        Tú
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{user.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Miembro desde <ClientOnlyDate date={user.created_at} />
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <UserRoleBadge role={user.role} />

                  {user.id !== currentUserId && (
                    <Select
                      value={user.role}
                      onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                      disabled={updatingUser === user.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="user_full">Usuario Completo</SelectItem>
                        <SelectItem value="user_restricted">Usuario Restringido</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
