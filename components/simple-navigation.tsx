"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings, User, LogOut } from "lucide-react"
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
import { useAuth } from "@/components/auth/auth-provider"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function SimpleNavigation() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseClient()

  // Función para determinar si un enlace está activo
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "user_full":
        return "default"
      case "user_restricted":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "user_full":
        return "Usuario Completo"
      case "user_restricted":
        return "Usuario Restringido"
      default:
        return "Usuario"
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <nav className="flex items-center space-x-2 lg:space-x-4 overflow-x-auto pb-2 pt-2">
          <Button asChild variant={isActive("/") ? "default" : "ghost"} className="flex-shrink-0">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Inicio
            </Link>
          </Button>

          <Button asChild variant={isActive("/weekly-menu") ? "default" : "ghost"} className="flex-shrink-0">
            <Link href="/weekly-menu">
              <CalendarDays className="mr-2 h-4 w-4" />
              Menú Semanal
            </Link>
          </Button>

          <Button
            asChild
            variant={isActive("/recipes") && !pathname.includes("/add") ? "default" : "ghost"}
            className="flex-shrink-0"
          >
            <Link href="/recipes">
              <ChefHat className="mr-2 h-4 w-4" />
              Recetas
            </Link>
          </Button>

          <Button asChild variant={isActive("/recipes/add") ? "default" : "ghost"} className="flex-shrink-0">
            <Link href="/recipes/add">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Receta
            </Link>
          </Button>

          <Button asChild variant={isActive("/categories") ? "default" : "ghost"} className="flex-shrink-0">
            <Link href="/categories">
              <Settings className="mr-2 h-4 w-4" />
              Categorías
            </Link>
          </Button>

          <Button asChild variant={isActive("/history") ? "default" : "ghost"} className="flex-shrink-0">
            <Link href="/history">
              <History className="mr-2 h-4 w-4" />
              Historial
            </Link>
          </Button>
        </nav>

        {/* Área de usuario en la esquina superior derecha */}
        <div className="flex items-center space-x-4">
          {user && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getUserInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
                    <Badge variant={getRoleBadgeColor(profile.role)} className="w-fit mt-1">
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Registrarse</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
