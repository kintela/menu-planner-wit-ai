"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { ChefHat, Calendar, LogOut, Menu, X, History, Settings, Home } from "lucide-react"

interface UserProfile {
  role: string
  full_name: string
}

export function SimpleNavigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single()

        setUserProfile(profile)
      }
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .single()

        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  // Función para verificar si el usuario puede ver una opción del menú
  const canViewMenuItem = (menuItem: string) => {
    // Si no hay usuario autenticado, ocultar Categorías e Historial
    if (!user || !userProfile) {
      if (menuItem === "categories" || menuItem === "history") {
        return false
      }
      return true
    }

    // Si hay usuario autenticado, verificar el rol
    if (userProfile.role === "user_restricted") {
      // Los usuarios restringidos no pueden ver Categorías e Historial
      if (menuItem === "categories" || menuItem === "history") {
        return false
      }
    }

    return true
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center justify-center p-2 text-gray-900" title="Inicio">
                <Home className="h-6 w-6" />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
              <div className="md:hidden">
                <Menu className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Home icon */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center justify-center p-2 text-gray-900" title="Inicio">
              <Home className="h-6 w-6" />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-2 ml-4">
              <Link
                href="/recipes"
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${
                  pathname === "/recipes" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ChefHat className="h-4 w-4" />
                <span>Recetas</span>
              </Link>

              <Link
                href="/weekly-menu"
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${
                  pathname === "/weekly-menu" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Menú Semanal</span>
              </Link>

              {canViewMenuItem("categories") && (
                <Link
                  href="/categories"
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${
                    pathname === "/categories" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Categorías</span>
                </Link>
              )}

              {canViewMenuItem("history") && (
                <Link
                  href="/history"
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${
                    pathname === "/history" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>Historial</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Desktop user info and actions */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <span className="text-sm text-gray-700">
                    Hola, {userProfile?.full_name || user.email}
                    {userProfile?.role === "admin" && (
                      <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Admin</span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-red-600 border-red-300 hover:bg-red-100 hover:text-red-700 hover:border-red-400 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Iniciar Sesión
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile quick access icons */}
            <div className="md:hidden flex items-center space-x-1">
              <Link href="/recipes" className="p-2" title="Recetas">
                <ChefHat className="h-5 w-5 text-gray-600" />
              </Link>
              <Link href="/weekly-menu" className="p-2" title="Menú Semanal">
                <Calendar className="h-5 w-5 text-gray-600" />
              </Link>
            </div>

            {/* Mobile user info or login */}
            <div className="md:hidden flex items-center space-x-2">
              {user ? (
                <span className="text-xs text-gray-700 max-w-20 truncate">
                  {userProfile?.full_name || user.email?.split("@")[0]}
                </span>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1">
                    Iniciar Sesión
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile hamburger menu - ALWAYS VISIBLE */}
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

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/recipes"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  pathname === "/recipes" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <ChefHat className="h-5 w-5" />
                <span>Recetas</span>
              </Link>

              <Link
                href="/weekly-menu"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  pathname === "/weekly-menu" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Calendar className="h-5 w-5" />
                <span>Menú Semanal</span>
              </Link>

              {canViewMenuItem("categories") && (
                <Link
                  href="/categories"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                    pathname === "/categories" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  <span>Categorías</span>
                </Link>
              )}

              {canViewMenuItem("history") && (
                <Link
                  href="/history"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                    pathname === "/history" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <History className="h-5 w-5" />
                  <span>Historial</span>
                </Link>
              )}

              {user && (
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar Sesión</span>
                </button>
              )}

              {!user && (
                <Link
                  href="/login"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Iniciar Sesión</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
