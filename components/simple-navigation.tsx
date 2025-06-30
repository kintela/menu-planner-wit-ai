"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, ChefHat, Home, BookOpen, History, LogOut, User } from "lucide-react"

export function SimpleNavigation() {
  const { user, loading, signOut } = useAuth()

  const getInitials = (email: string) => {
    return email.split("@")[0].slice(0, 2).toUpperCase()
  }

  const getAvatarUrl = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url
    }
    if (user?.user_metadata?.picture) {
      return user.user_metadata.picture
    }
    return null
  }

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    if (user?.email) {
      return user.email.split("@")[0]
    }
    return "Usuario"
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
              <Link href="/" className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
                <Home className="h-4 w-4" />
                <span>Inicio</span>
              </Link>
              <Link href="/recipes" className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
                <BookOpen className="h-4 w-4" />
                <span>Recetas</span>
              </Link>
              <Link href="/weekly-menu" className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
                <Calendar className="h-4 w-4" />
                <span>Menú Semanal</span>
              </Link>
              <Link href="/categories" className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
                <BookOpen className="h-4 w-4" />
                <span>Categorías</span>
              </Link>
              <Link href="/history" className="flex items-center space-x-2 text-sm font-medium hover:text-primary">
                <History className="h-4 w-4" />
                <span>Historial</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarUrl() || undefined} alt={getDisplayName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline-block">{getDisplayName()}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="flex items-center space-x-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
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
      </div>
    </nav>
  )
}
