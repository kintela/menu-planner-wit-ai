"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Menu, Calendar } from "lucide-react"

export function SimpleNavigation() {
  const { user, profile, signOut } = useAuth()

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return "U"
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <Menu className="h-6 w-6" />
              <span className="font-bold text-xl">Menu Planner</span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center space-x-4">
                <Link href="/recipes" className="text-sm font-medium hover:text-primary">
                  Recetas
                </Link>
                <Link href="/weekly-menu" className="text-sm font-medium hover:text-primary flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Menú Semanal
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={profile?.avatar_url || undefined}
                      alt={profile?.full_name || user.email || "User"}
                    />
                    <AvatarFallback>{getInitials(profile?.full_name, user.email)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{profile?.full_name || user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="flex items-center gap-1">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
