import { createServerClient } from "@/lib/supabase/server"

interface RecipeOwnerInfoProps {
  userId: string
  className?: string
}

export async function RecipeOwnerInfo({ userId, className = "" }: RecipeOwnerInfoProps) {
  const supabase = createServerClient()

  try {
    const { data: profile } = await supabase.from("user_profiles").select("full_name, email").eq("id", userId).single()

    if (!profile) {
      return null
    }

    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <span>Creada por: {profile.full_name || profile.email}</span>
      </div>
    )
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return null
  }
}
