import { getCurrentUserProfile } from "@/lib/auth"
import { UserManagement } from "@/components/admin/user-management"
import { redirect } from "next/navigation"

export default async function AdminUsersPage() {
  const profile = await getCurrentUserProfile()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-gray-600 mt-2">Administra los usuarios y sus permisos en la aplicación</p>
      </div>

      <UserManagement />
    </div>
  )
}
