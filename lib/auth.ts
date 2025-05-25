import { createServerClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = createServerClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Auth error:", error)
    return null
  }
}

export async function isAdmin(userId: string) {
  const supabase = createServerClient()

  try {
    // Verificar si el usuario es admin en la tabla de usuarios
    const { data, error } = await supabase.from("user_profiles").select("role").eq("user_id", userId).single()

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

// Lista de emails de administradores (temporal hasta crear tabla)
const ADMIN_EMAILS = [
  "tu-email@gmail.com", // Cambia por tu email
]

export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
