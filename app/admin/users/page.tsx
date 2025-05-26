import { getCurrentUserProfile } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase/server"
import { RoleGuard } from "@/components/role-guard"
import { UserManagement } from "@/components/admin/user-management"
import { redirect } from "next/navigation"
import type { UserProfile } from "@/lib/types"

export default async function AdminUsersPage() {
  const currentProfile = await getCurrentUserProfile()

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/")
  }

  const supabase = createServerClient()

  // Obtener todos los usuarios
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching users:", error)
  }

  return (
    <RoleGuard requiredRole="admin">
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Gestión de Usuarios</h1>
        <UserManagement users={(users as UserProfile[]) || []} currentUserId={currentProfile.id} />
      </div>
    </RoleGuard>
  )
}
