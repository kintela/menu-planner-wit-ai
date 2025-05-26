"use client"

import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import type { UserProfile } from "@/lib/types"

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log("🔍 Fetching profile for user:", user.id)

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("❌ Error fetching profile:", profileError)
          setError(profileError.message)
          setProfile(null)
        } else {
          console.log("✅ Profile fetched successfully:", profileData)
          setProfile(profileData as UserProfile)
        }
      } catch (err) {
        console.error("💥 Unexpected error fetching profile:", err)
        setError("Error inesperado al cargar el perfil")
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user, supabase])

  const refreshProfile = async () => {
    if (!user) return

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("❌ Error refreshing profile:", profileError)
        setError(profileError.message)
      } else {
        console.log("🔄 Profile refreshed successfully:", profileData)
        setProfile(profileData as UserProfile)
        setError(null)
      }
    } catch (err) {
      console.error("💥 Unexpected error refreshing profile:", err)
      setError("Error inesperado al actualizar el perfil")
    }
  }

  return {
    profile,
    loading,
    error,
    refreshProfile,
  }
}
