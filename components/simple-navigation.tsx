"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { ChefHat, Calendar, LogOut, History, Settings, Home } from "lucide-react"

interface UserProfile {
  role: string
  full_name: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
}

export default function SimpleNavigation() {
  const { user, loading, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [avatarKey, setAvatarKey] = useState(Date.now())

  const getDisplayName = (profile: UserProfile | null, email: string): string => {
    if (!profile) return email

    if (profile.alias && profile.alias.trim() !== "") {
      return profile.alias
    }

    if (
      profile.first_name &&
      profile.last_name &&
      profile.first_name.trim() !== "" &&
      profile.last_name.trim() !== ""
    ) {
      return `${profile.first_name} ${profile.last_name}`
    }

    if (profile.full_name && profile.full_name.trim() !== "") {
      return profile.full_name
    }

    return email
  }

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("role, full_name, first_name, last_name, alias, avatar_url")
        .eq("id", userId)
        .single()

      if (error) {
        return null
      }

      return profile
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
    async function getUser() {
      try {
        if (user) {
          const profile = await loadUserProfile(user.id)
          if (profile) {
            setUserProfile(profile)
          }
        }
      } catch (error) {
        console.error("Error getting user for navigation:", error)
      }
    }

    getUser()

    const handleProfileUpdate = async (event: Event) => {
      setAvatarKey(Date.now())

      if (user) {
        const profile = await loadUserProfile(user.id)
        if (profile) {
          setUserProfile(profile)
        }
      }
    }

    window.addEventListener("avatar_updated", handleProfileUpdate)

    return () => {
      window.removeEventListener("avatar_updated", handleProfileUpdate)
    }
  }, [user])

  const canViewMenuItem = (menuItem: string) => {
    if (!user || !userProfile) {
      if (menuItem === "categories" || menuItem === "history") {
        return false
      }
      return true
    }

    if (userProfile.role === "user_restricted") {
      if (menuItem === "categories" || menuItem === "history") {
        return false
      }
    }

    return true
  }

  if (loading) {
    return (
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="animate-pulse flex space-x-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const displayName = user ? getDisplayName(userProfile, user.email || "") : ""

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Link>

            <Link
              href="/recipes"
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ChefHat className="h-4 w-4" />
              <span>Recetas</span>
            </Link>

            <Link
              href="/weekly-menu"
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Menú Semanal</span>
            </Link>

            {canViewMenuItem("categories") && (
              <Link
                href="/categories"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Categorías</span>
              </Link>
            )}

            {canViewMenuItem("history") && (
              <Link
                href="/history"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <History className="h-4 w-4" />
                <span>Historial</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={userProfile?.avatar_url || undefined}
                      alt="Avatar"
                      key={`avatar-${avatarKey}-${userProfile?.avatar_url}`}
                    />
                    <AvatarFallback className="text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-blue-600">{displayName}</span>
                  {userProfile?.role === "admin" && (
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Admin</span>
                  )}
                </div>
                <Button
                  onClick={signOut}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">Iniciar Sesión</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
