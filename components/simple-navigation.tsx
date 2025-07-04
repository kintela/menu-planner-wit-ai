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
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = getSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Listen for auth changes
    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setUser(null)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getUserInitials = (email: string) => {
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
              <Calendar className="h-4 w-4" />
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
                  src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                  alt={user.email || "Usuario"}
                />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
                  {getUserInitials(user.email || "")}
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
