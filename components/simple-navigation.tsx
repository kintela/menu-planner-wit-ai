"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Calendar, LogOut, Menu, Snowflake, User, X, Sprout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { useEffect, useState } from "react"
import { requestWeeklyMenuExit } from "@/lib/weekly-menu/weekly-menu-unsaved-guard"
import { useToast } from "@/hooks/use-toast"

export function SimpleNavigation() {
  const pathname = usePathname()
  const { user, profile, loading, signOut } = useAuth()
  const { toast } = useToast()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [freezerAvailable, setFreezerAvailable] = useState(false)
  const avatarUrl = avatarFailed ? null : profile?.avatar_url ?? null

  useEffect(() => {
    setAvatarFailed(false)
  }, [user, profile?.avatar_url])

  useEffect(() => {
    let active = true

    if (loading || !user) {
      setFreezerAvailable(false)
      return () => {
        active = false
      }
    }

    fetch("/api/freezer", { method: "GET", credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (active) setFreezerAvailable(response.ok && payload?.isOwner === true)
      })
      .catch(() => {
        if (active) setFreezerAvailable(false)
      })

    return () => {
      active = false
    }
  }, [loading, user])

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    if (user?.email) {
      const emailParts = user.email.split("@")[0]
      if (emailParts.includes(".") || emailParts.includes("-") || emailParts.includes("_")) {
        return emailParts
          .split(/[.\-_]/)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      }
      return emailParts.slice(0, 2).toUpperCase()
    }

    return "U"
  }

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/recipes", label: "Recetas", icon: BookOpen },
    { href: "/weekly-menu", label: "Planificar", icon: Calendar },
    ...(freezerAvailable ? [{ href: "/freezer", label: "Congelador", icon: Snowflake }] : []),
    { href: "/seasonal-products", label: "Temporada", icon: Sprout },
  ]

  useEffect(() => {
    // Cerrar el menú móvil al cambiar de ruta
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    if (!requestWeeklyMenuExit()) return
    setIsMobileMenuOpen(false)
    setAvatarFailed(false)
    const signedOut = await signOut()
    if (!signedOut) {
      toast({
        variant: "destructive",
        title: "No se pudo cerrar la sesión",
        description: "Inténtalo de nuevo.",
      })
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            MenuPlanner
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : user ? (
              <div className="hidden md:flex items-center space-x-3">
                {avatarUrl ? (
                  <img
                    key={avatarUrl}
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                    {getInitials()}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </Button>
              </div>
            ) : (
              <div className="hidden md:block">
                <Button asChild>
                  <Link href="/login">
                    <User className="h-4 w-4 mr-2" />
                    Iniciar Sesión
                  </Link>
                </Button>
              </div>
            )}

            {/* Mobile actions */}
            <div className="md:hidden flex items-center gap-2">
              {loading ? (
                <div className="text-sm text-gray-500">Cargando...</div>
              ) : user ? (
                <>
                  {avatarUrl ? (
                    <img
                      key={avatarUrl}
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-8 w-8 rounded-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center">
                      {getInitials()}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Button asChild size="sm">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <User className="h-4 w-4 mr-2" />
                    Iniciar sesión
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white shadow-sm">
          <div className="px-4 py-3 space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "border-blue-200 bg-blue-50 text-blue-600" : "border-transparent text-gray-700 hover:border-blue-100 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {isActive && <span className="text-xs text-blue-500">•</span>}
                </Link>
              )
            })}

            {loading ? (
              <div className="text-sm text-gray-500">Cargando...</div>
            ) : user ? (
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            ) : (
              <Button asChild className="w-full justify-center">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <User className="h-4 w-4 mr-2" />
                  Iniciar sesión
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
