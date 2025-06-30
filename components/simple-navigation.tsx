"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"

import { ChefHat, Calendar, LogOut, Menu, X, History, Settings, Home, LogIn } from "lucide-react"

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
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">Menu Planner</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <div className="animate-pulse h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const displayName = user ? getDisplayName(userProfile, user.email) : ""

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">Menu Planner</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex items-center">
            <Link href="/" className="flex items-center justify-center p-2 text-gray-900" title="Inicio">
              <Home className="h-6 w-6" />
            </Link>

            <div className="hidden md:flex items-center space-x-2 ml-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/recipes">
                  <ChefHat className="h-4 w-4" />
                  <span className="sr-only">Recetas</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/weekly-menu">
                  <Calendar className="h-4 w-4" />
                  <span className="sr-only">Menú Semanal</span>
                </Link>
              </Button>
              {canViewMenuItem("categories") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/categories">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Categorías</span>
                  </Link>
                </Button>
              )}
              {canViewMenuItem("history") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/history">
                    <History className="h-4 w-4" />
                    <span className="sr-only">Historial</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage
                        src={userProfile?.avatar_url || undefined}
                        alt="Avatar"
                        key={`desktop-avatar-${avatarKey}-${userProfile?.avatar_url}`}
                      />
                      <AvatarFallback className="text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>
                      {displayName}
                      {userProfile?.role === "admin" && (
                        <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Admin</span>
                      )}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="flex items-center space-x-1 text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Cerrar Sesión</span>
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span className="sr-only">Iniciar Sesión</span>
                  </Link>
                </Button>
              )}
            </div>

            <div className="md:hidden flex items-center space-x-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/recipes" className="p-2" title="Recetas">
                  <ChefHat className="h-5 w-5 text-gray-600" />
                  <span className="sr-only">Recetas</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/weekly-menu" className="p-2" title="Menú Semanal">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="sr-only">Menú Semanal</span>
                </Link>
              </Button>
            </div>

            <div className="md:hidden flex items-center space-x-2">
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage
                      src={userProfile?.avatar_url || undefined}
                      alt="Avatar"
                      key={`mobile-avatar-${avatarKey}-${userProfile?.avatar_url}`}
                    />
                    <AvatarFallback className="text-xs">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-24 truncate">{displayName}</span>
                </Link>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    <span className="sr-only">Iniciar Sesión</span>
                  </Link>
                </Button>
              )}
            </div>

            <div className="md:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 border-gray-300"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/recipes"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ChefHat className="h-5 w-5" />
                  <span>Recetas</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/weekly-menu"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar className="h-5 w-5" />
                  <span>Menú Semanal</span>
                </Link>
              </Button>
              {canViewMenuItem("categories") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/categories"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Categorías</span>
                  </Link>
                </Button>
              )}
              {canViewMenuItem("history") && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/history"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <History className="h-5 w-5" />
                    <span>Historial</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Mi Perfil</span>
                </Link>
              </Button>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </Button>
              )}
              {!user && (
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href="/login"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Iniciar Sesión</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
