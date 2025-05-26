"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings, LogOut, User, Users } from "lucide-react"
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
  const canCreateRecipes = permissions.includes("create_recipes")
  const canManageCategories = permissions.includes("manage_categories")
  const canManageUsers = permissions.includes("manage_users")

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

            {permissions.includes("view_weekly_menu") && (
              <NavigationMenuItem>
                <Link href="/weekly-menu" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Menú Semanal
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

            {permissions.includes("view_recipes") && (
              <NavigationMenuItem>
                <Link href="/recipes" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <ChefHat className="mr-2 h-4 w-4" />
                    Recetas
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

            {canCreateRecipes && (
              <NavigationMenuItem>
                <Link href="/recipes/add" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Receta
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

            {canManageCategories && (
              <NavigationMenuItem>
                <Link href="/categories" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Categorías
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

            {permissions.includes("view_history") && (
              <NavigationMenuItem>
                <Link href="/history" legacyBehavior passHref>
                  <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                    <History className="mr-2 h-4 w-4" />
                    Historial
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

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

        {/* User Menu */}
        {user && (
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
        )}
      </div>
    </header>
  )
}
