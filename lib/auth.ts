import { createServerClient } from "@/lib/supabase/server"
import type { UserProfile, UserRole } from "@/lib/types"
import { headers } from 'next/headers'; // Cambiar cookies() por headers() para obtener cookies en el servidor

export async function getCurrentUser() {
  const cookieStore = headers(); // Usar headers() para obtener cookies
  const supabase = createServerClient(cookieStore);

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting user:", error);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const cookieStore = headers(); // Cambiar cookies() por headers() para obtener cookies en el servidor
  const supabase = createServerClient(cookieStore)

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error getting user profile:", profileError)
      return null
    }

    return profile as UserProfile
  } catch (error) {
    console.error("Profile error:", error)
    return null
  }
}

export async function isAdmin(userId?: string): Promise<boolean> {
  const cookieStore = headers(); // Cambiar cookies() por headers() para obtener cookies en el servidor
  const supabase = createServerClient(cookieStore)

  try {
    let targetUserId = userId

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    const { data, error } = await supabase.from("user_profiles").select("role").eq("id", targetUserId).single()

    if (error) {
      console.error("Error checking admin status:", error)
      return false
    }

    return data?.role === "admin"
  } catch (error) {
    console.error("Admin check error:", error)
    return false
  }
}

export async function hasRole(role: UserRole, userId?: string): Promise<boolean> {
  const cookieStore = headers(); // Cambiar cookies() por headers() para obtener cookies en el servidor
  const supabase = createServerClient(cookieStore)

  try {
    let targetUserId = userId

    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false
      targetUserId = user.id
    }

    const { data, error } = await supabase.from("user_profiles").select("role").eq("id", targetUserId).single()

    if (error) {
      console.error("Error checking user role:", error)
      return false
    }

    return data?.role === role
  } catch (error) {
    console.error("Role check error:", error)
    return false
  }
}

export async function canAccessFeature(feature: string, userId?: string): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  if (!profile) return false

  const permissions = getPermissionsByRole(profile.role)
  return permissions.includes(feature)
}

export function getPermissionsByRole(role: UserRole): string[] {
  const permissions = {
    admin: [
      "view_recipes",
      "create_recipes",
      "edit_recipes",
      "delete_recipes",
      "view_categories",
      "manage_categories",
      "view_weekly_menu",
      "create_weekly_menu",
      "edit_weekly_menu",
      "view_history",
      "manage_users",
      "use_ai_suggestions",
      "upload_images",
      "export_data",
    ],
    user_full: [
      "view_recipes",
      "create_recipes",
      "edit_recipes",
      "delete_recipes",
      "view_categories",
      "manage_categories",
      "view_weekly_menu",
      "create_weekly_menu",
      "edit_weekly_menu",
      "view_history",
      "use_ai_suggestions",
      "upload_images",
    ],
    user_restricted: ["view_recipes", "view_categories", "view_weekly_menu", "view_history"],
  }

  return permissions[role] || []
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    admin: "Administrador",
    user_full: "Usuario Completo",
    user_restricted: "Usuario Restringido",
  }

  return roleNames[role] || "Usuario"
}

export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    admin: "Acceso completo a todas las funciones y gestión de usuarios",
    user_full: "Acceso completo para crear, editar y gestionar recetas y menús",
    user_restricted: "Solo puede ver recetas, categorías y menús existentes",
  }

  return descriptions[role] || ""
}

// Lista de emails de administradores (para el trigger de la base de datos)
const ADMIN_EMAILS = [
  "roberto.quintela@protonmail.com", // Tu email como administrador
]

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
