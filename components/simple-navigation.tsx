"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChefHat, Calendar, BookOpen, History, Home, LogOut } from "lucide-react"

export default function SimpleNavigation() {
  const { user, loading, signOut } = useAuth()

  const getAvatarUrl = (user: any) => {
    if (!user?.user_metadata?.avatar_url) return null

    const avatarUrl = user.user_metadata.avatar_url

    // Si ya es una URL completa, usarla tal como está
    if (avatarUrl.startsWith("http")) {
      return avatarUrl
    }

    // Si no, construir la URL del bucket de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`
  }

  const getDisplayName = (user: any) => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    if (user?.user_metadata?.name) return user.user_metadata.name
    if (user?.email) return user.email
    return "Usuario"
  }

  const getInitials = (user: any) => {
    const email = user?.email || ""
    const username = email.split("@")[0]
    return username.slice(0, 2).toUpperCase()
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
                <ChefHat className="h-4 w-4" />
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
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarUrl(user) || "/placeholder.svg"} alt={getDisplayName(user)} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">{getInitials(user)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline-block">{getDisplayName(user)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="flex items-center space-x-1">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </div>
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
