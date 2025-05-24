"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings } from "lucide-react"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
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
            <NavigationMenuItem>
              <Link href="/weekly-menu" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Menú Semanal
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/recipes" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <ChefHat className="mr-2 h-4 w-4" />
                  Recetas
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/recipes/add" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Receta
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/categories" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Categorías
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/history" legacyBehavior passHref>
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} cursor-pointer`}>
                  <History className="mr-2 h-4 w-4" />
                  Historial
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  )
}
