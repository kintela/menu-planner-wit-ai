"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChefHat, LogOut, User } from "lucide-react"

export function SimpleNavigation() {
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <ChefHat className="h-6 w-6" />
              <span className="font-bold text-xl">Menu Planner</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                Inicio
              </Link>
              <Link href="/recipes" className="text-sm font-medium transition-colors hover:text-primary">
                Recetas
              </Link>
              <Link href="/weekly-menu" className="text-sm font-medium transition-colors hover:text-primary">
                Menú Semanal
              </Link>
              <Link href="/categories" className="text-sm font-medium transition-colors hover:text-primary">
                Categorías
              </Link>
              <Link href="/history" className="text-sm font-medium transition-colors hover:text-primary">
                Historial
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline-block">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="default" size="sm">
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
