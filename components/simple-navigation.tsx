"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Home, Book, Calendar, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getSupabaseClient } from "@/lib/supabase/client"

export function SimpleNavigation() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        setUser(user)

        if (user) {
          console.log("Fetching profile for user:", user.id)

          // Fetch user profile
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          console.log("Profile data:", profile)
          setUserProfile(profile)

          // Look for avatar in the avatars bucket under user's folder
          const { data: files, error: listError } = await supabase.storage.from("avatars").list(user.id, {
            limit: 1,
            sortBy: { column: "created_at", order: "desc" },
          })

          console.log("Files in avatar folder:", files)
          console.log("List error:", listError)

          if (files && files.length > 0) {
            const avatarFile = files[0]
            const avatarPath = `${user.id}/${avatarFile.name}`

            console.log("Avatar path:", avatarPath)

            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(avatarPath)

            console.log("Generated public URL:", urlData.publicUrl)
            setAvatarUrl(urlData.publicUrl)
          } else {
            console.log("No avatar files found for user")
            setAvatarUrl(null)
          }
        }
      } catch (error) {
        console.error("Error fetching user and profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndProfile()

    // Listen for auth changes
    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Fetch profile for new user
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", currentUser.id).single()
        setUserProfile(profile)

        // Look for avatar in the avatars bucket under user's folder
        const { data: files } = await supabase.storage.from("avatars").list(currentUser.id, {
          limit: 1,
          sortBy: { column: "created_at", order: "desc" },
        })

        if (files && files.length > 0) {
          const avatarFile = files[0]
          const avatarPath = `${currentUser.id}/${avatarFile.name}`

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(avatarPath)

          setAvatarUrl(urlData.publicUrl)
        } else {
          setAvatarUrl(null)
        }
      } else {
        setUserProfile(null)
        setAvatarUrl(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setUser(null)
      setUserProfile(null)
      setAvatarUrl(null)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      const nameParts = name.trim().split(" ")
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      } else {
        return nameParts[0].slice(0, 2).toUpperCase()
      }
    }

    if (!email) return "U"

    // Try to get initials from email name part
    const namePart = email.split("@")[0]
    const parts = namePart.split(/[._-]/)

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    } else {
      return namePart.slice(0, 2).toUpperCase()
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo y navegación principal */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            MenuPlanner
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Link>
            <Link
              href="/recipes"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Book className="h-4 w-4" />
              <span>Recetas</span>
            </Link>
            <Link
              href="/weekly-menu"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Calendar className="h-5 w-5" />
              <span>Planificar</span>
            </Link>
          </div>
        </div>

        {/* Menú de usuario */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : user ? (
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={avatarUrl || undefined}
                  alt={userProfile?.full_name || user.email || "Usuario"}
                  onError={() => console.log("Avatar image failed to load:", avatarUrl)}
                  onLoad={() => console.log("Avatar image loaded successfully:", avatarUrl)}
                />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
                  {getUserInitials(user.email || "", userProfile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2 bg-transparent"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Cerrar Sesión</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Navegación móvil */}
      <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
        <div className="flex justify-around">
          <Link
            href="/"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Inicio</span>
          </Link>
          <Link
            href="/recipes"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Book className="h-5 w-5" />
            <span className="text-xs">Recetas</span>
          </Link>
          <Link
            href="/weekly-menu"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Planificar</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
