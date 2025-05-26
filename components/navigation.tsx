"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { Lock, LogOut, Users, ChefHat, Calendar } from "lucide-react"

interface UserProfile {
  role: string
  full_name: string
}

export default function Navigation() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
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
    window.location.href = "/auth/login"
  }

  const handleProtectedClick = (e: React.MouseEvent, href: string) => {
    if (!user) {
      e.preventDefault()
      window.location.href = "/auth/login"
    }
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Menu Planner</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Menu Planner
            </Link>

            {user && (
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  href="/recipes"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/recipes" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <ChefHat className="h-4 w-4" />
                  <span>Recetas</span>
                </Link>

                <Link
                  href="/menu-planner"
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === "/menu-planner" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Planificador</span>
                </Link>

                {userProfile?.role === "admin" && (
                  <Link
                    href="/users"
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === "/users" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Usuarios</span>
                  </Link>
                )}
              </div>
            )}

            {!user && (
              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={(e) => handleProtectedClick(e, "/recipes")}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <Lock className="h-4 w-4" />
                  <span>Recetas</span>
                </button>

                <button
                  onClick={(e) => handleProtectedClick(e, "/menu-planner")}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <Lock className="h-4 w-4" />
                  <span>Planificador</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  Hola, {userProfile?.full_name || user.email}
                  {userProfile?.role === "admin" && (
                    <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Admin</span>
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="flex items-center space-x-1">
                  <LogOut className="h-4 w-4" />
                  <span>Salir</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
