// Client-safe subset of auth utilities (sin dependencias a server cookies)
import type { UserRole } from "@/lib/types"

export function getPermissionsByRole(role: UserRole): string[] {
  const permissions = {
    admin: [
      "view_recipes","create_recipes","edit_recipes","delete_recipes","view_categories","manage_categories","view_weekly_menu","create_weekly_menu","edit_weekly_menu","view_history","manage_users","use_ai_suggestions","upload_images","export_data"
    ],
    user_full: [
      "view_recipes","create_recipes","edit_recipes","delete_recipes","view_categories","manage_categories","view_weekly_menu","create_weekly_menu","edit_weekly_menu","view_history","use_ai_suggestions","upload_images"
    ],
    user_restricted: ["view_recipes","view_categories","view_weekly_menu","view_history"],
  } as const
  return (permissions as any)[role] || []
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    admin: "Administrador",
    user_full: "Usuario Completo",
    user_restricted: "Usuario Restringido",
  } as const
  return (roleNames as any)[role] || "Usuario"
}

export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    admin: "Acceso completo a todas las funciones y gestión de usuarios",
    user_full: "Acceso completo para crear, editar y gestionar recetas y menús",
    user_restricted: "Solo puede ver recetas, categorías y menús existentes",
  } as const
  return (descriptions as any)[role] || ""
}

export function isAdminEmail(email: string): boolean {
  const ADMIN_EMAILS = ["roberto.quintela@protonmail.com"]
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
