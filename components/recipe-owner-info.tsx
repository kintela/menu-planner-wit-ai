import { createServerClient } from "@/lib/supabase/server"

interface RecipeOwnerInfoProps {
  userId: string
  className?: string
  showPrefix?: boolean
}

export async function RecipeOwnerInfo({ userId, className = "", showPrefix = true }: RecipeOwnerInfoProps) {
  const supabase = createServerClient()

  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, email, avatar_url, alias")
      .eq("id", userId)
      .single()

    if (!profile) {
      return null
    }

    // Determinar qué nombre mostrar
    const displayName = profile.alias || profile.full_name || profile.email

    return (
      <div className={`flex items-center gap-2 text-sm text-white bg-black/50 px-2 py-1 rounded-full ${className}`}>
        {/* Avatar o icono por defecto */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url || "/placeholder.svg"}
            alt={displayName}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}

        {/* Texto con o sin prefijo */}
        <span className="text-xs">{showPrefix ? `Creada por: ${displayName}` : displayName}</span>
      </div>
    )
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}
