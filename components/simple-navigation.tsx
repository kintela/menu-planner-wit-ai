"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, PlusCircle, Home, History, Settings, User, LogOut, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-provider"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function SimpleNavigation() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const { profile } = useUserProfile()

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  const navigationItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/recipes", label: "Recetas", icon: ChefHat },
    { href: "/recipes/add", label: "Añadir Receta", icon: PlusCircle },
    { href: "/weekly-menu", label: "Menú Semanal", icon: CalendarDays },
    { href: "/categories", label: "Categorías", icon: Settings },
    { href: "/history", label: "Historial", icon: History },
  ]

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name
    if (user?.email) return user.email.split("@")[0]
    return "Usuario"
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <ChefHat className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">Menu Planner</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-6 text-sm font-medium overflow-x-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 transition-colors hover:text-foreground/80 whitespace-nowrap",
                    isActive(item.href) ? "text-foreground" : "text-foreground/60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sección de usuario */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    {profile?.role && (
                      <div className="pt-1">
                        <Badge variant={profile.role === "admin" ? "destructive" : "secondary"} className="text-xs">
                          {profile.role === "admin"
                            ? "Administrador"
                            : profile.role === "user_full"
                              ? "Usuario Completo"
                              : "Usuario Restringido"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </Link>
                </DropdownMenuItem>
                {profile?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Gestión de Usuarios</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar Sesión
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
