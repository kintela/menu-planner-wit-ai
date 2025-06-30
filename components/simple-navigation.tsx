"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, ChefHat, Home, BookOpen, History, Tags } from "lucide-react"

export function SimpleNavigation() {
  const { user, loading, signOut } = useAuth()

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <ChefHat className="h-6 w-6" />
              <span className="font-bold text-xl">MenuPlanner</span>
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
                <Tags className="h-4 w-4" />
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
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Cerrar Sesión
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
