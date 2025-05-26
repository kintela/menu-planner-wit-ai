"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChefHat, Menu, X, User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useUserProfile } from "@/hooks/use-user-profile"
import { UserRoleBadge } from "@/components/user-role-badge"

const navigationItems = [
  { href: "/", label: "Inicio" },
  { href: "/recipes", label: "Recetas" },
  { href: "/recipes/add", label: "Añadir Receta", requiresAuth: true },
  { href: "/weekly-menu", label: "Menú Semanal" },
  { href: "/categories", label: "Categorías" },
]

export function SimpleNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase()
  }

  const filteredNavItems = navigationItems.filter((item) => {
    if (item.requiresAuth && !user) {
      return false
    }
    return true
  })

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl text-gray-900">MenuPlanner</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href ? "text-primary" : "text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {authLoading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.email || "U")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      {profile && !profileLoading && (
                        <div className="flex items-center space-x-2">
                          <UserRoleBadge role={profile.role} />
                        </div>
                      )}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/users">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Administración</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 text-base font-medium transition-colors hover:text-primary ${
                    pathname === item.href ? "text-primary bg-primary/10" : "text-gray-700"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile User Menu */}
              <div className="border-t pt-4 mt-4">
                {authLoading ? (
                  <div className="px-3 py-2">
                    <div className="w-full h-8 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : user ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      {profile && !profileLoading && (
                        <div className="mt-1">
                          <UserRoleBadge role={profile.role} />
                        </div>
                      )}
                    </div>
                    <Link
                      href="/profile"
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary"
                      onClick={() => setIsOpen(false)}
                    >
                      Perfil
                    </Link>
                    {profile?.role === "admin" && (
                      <Link
                        href="/admin/users"
                        className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary"
                        onClick={() => setIsOpen(false)}
                      >
                        Administración
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2">
                    <Button asChild variant="default" size="sm" className="w-full">
                      <Link href="/login" onClick={() => setIsOpen(false)}>
                        Iniciar sesión
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
