"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings, LogOut, User, Users, Lock } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import { useUserProfile } from "@/hooks/use-user-profile"
import { UserRoleBadge } from "@/components/user-role-badge"
import { getPermissionsByRole } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { profile } = useUserProfile()

  // No mostrar navegación en la página de login
  if (pathname === "/login") {
    return null
  }

  const getUserInitials = (email: string) => {
    return email.split("@")[0].slice(0, 2).toUpperCase()
  }

  const permissions = profile ? getPermissionsByRole(profile.role) : []
  const canManageUsers = user ? permissions.includes("manage_users") : false

  // Componente para enlaces que requieren autenticación
  const ProtectedNavLink = ({ href, children, icon: Icon }: { href: string; children: React.ReactNode; icon: any }) => {
    const handleClick = (e: React.MouseEvent) => {
      if (!user) {
        e.preventDefault()
        // Redirigir al login con la ruta de destino
        window.location.href = `/login?redirect=${encodeURIComponent(href)}`
      }
    }

    return (
      <NavigationMenuItem>
        <Link href={href} legacyBehavior passHref>
          <NavigationMenuLink
            className={`${navigationMenuTriggerStyle()} cursor-pointer ${!user ? "opacity-60" : ""}`}
            onClick={handleClick}
          >
            <Icon className="mr-2 h-4 w-4" />
            {children}
            {!user && <Lock className="ml-2 h-3 w-3" />}
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <Home className="mr-2 h-4 w-4" />
                  Inicio
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            <ProtectedNavLink href="/weekly-menu" icon={CalendarDays}>
              Menú Semanal
            </ProtectedNavLink>

            <ProtectedNavLink href="/recipes" icon={ChefHat}>
              Recetas
            </ProtectedNavLink>

            <ProtectedNavLink href="/recipes/add" icon={PlusCircle}>
              Añadir Receta
            </ProtectedNavLink>

            <ProtectedNavLink href="/categories" icon={Settings}>
              Categorías
            </ProtectedNavLink>

            <ProtectedNavLink href="/history" icon={History}>
              Historial
            </ProtectedNavLink>

            {canManageUsers && (
              <NavigationMenuItem>
                <Link href="/admin/users" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <Users className="mr-2 h-4 w-4" />
                    Usuarios
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Menu o Login Button */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(user.email || "")}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile?.full_name || user.email}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                  {profile && <UserRoleBadge role={profile.role} />}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Lock className="mr-1 h-3 w-3" />
              Inicia sesión para acceder
            </Badge>
            <Button asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
