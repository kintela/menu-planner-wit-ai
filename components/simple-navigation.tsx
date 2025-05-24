"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SimpleNavigation() {
  const pathname = usePathname()

  // Función para determinar si un enlace está activo
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <nav className="flex items-center space-x-2 lg:space-x-4 overflow-x-auto pb-2 pt-2 w-full">
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
      </div>
    </header>
  )
}
