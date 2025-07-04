"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Calendar, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export function SimpleNavigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserAvatar() {
      if (!user) {
        setUserProfile(null)
        setAvatarUrl(null)
        return
      }

      try {
        const supabase = getSupabaseClient()

        console.log("Loading avatar for user:", user.id)

        // Buscar archivos en la carpeta del usuario en el bucket avatars
        const { data: files, error } = await supabase.storage.from("avatars").list(user.id, {
          limit: 10,
          sortBy: { column: "created_at", order: "desc" },
        })

        console.log("Files found in avatars bucket:", files, "Error:", error)

        if (files && files.length > 0) {
          // Tomar el primer archivo (más reciente)
          const avatarFile = files[0]
          console.log("Using avatar file:", avatarFile)

          // Construir la ruta completa del archivo
          const filePath = `${user.id}/${avatarFile.name}`
          console.log("Avatar file path:", filePath)

          // Obtener la URL pública
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath)

          console.log("Generated avatar URL:", urlData.publicUrl)
          setAvatarUrl(urlData.publicUrl)
        } else {
          console.log("No avatar files found for user")
          setAvatarUrl(null)
        }

        // También cargar el perfil del usuario para obtener el nombre
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

        console.log("User profile:", profile)
        setUserProfile(profile)
      } catch (error) {
        console.error("Error loading user avatar:", error)
        setAvatarUrl(null)
      }
    }

    loadUserAvatar()
  }, [user])

  const getInitials = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    if (user?.email) {
      const emailParts = user.email.split("@")[0]
      if (emailParts.includes(".") || emailParts.includes("-") || emailParts.includes("_")) {
        return emailParts
          .split(/[.\-_]/)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      }
      return emailParts.slice(0, 2).toUpperCase()
    }

    return "U"
  }

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/recipes", label: "Recetas", icon: BookOpen },
    { href: "/weekly-menu", label: "Planificar", icon: Calendar },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            MenuPlanner
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={avatarUrl || undefined}
                    alt="Avatar"
                    onError={() => {
                      console.log("Error loading avatar image")
                      setAvatarUrl(null)
                    }}
                    onLoad={() => {
                      console.log("Avatar image loaded successfully")
                    }}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center space-x-2 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </div>
            ) : (
              <Button asChild>
                <Link href="/login">
                  <User className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
