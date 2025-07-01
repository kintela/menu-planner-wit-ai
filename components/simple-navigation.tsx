"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChefHat, Calendar, Home, Plus } from "lucide-react"

export function SimpleNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <ChefHat className="h-6 w-6 text-blue-600" />
            Menu Planner
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant={isActive("/") ? "default" : "ghost"} size="sm">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Inicio
              </Link>
            </Button>

            <Button asChild variant={isActive("/recipes") ? "default" : "ghost"} size="sm">
              <Link href="/recipes">
                <ChefHat className="h-4 w-4 mr-2" />
                Recetas
              </Link>
            </Button>

            <Button asChild variant={isActive("/weekly-menu") ? "default" : "ghost"} size="sm">
              <Link href="/weekly-menu">
                <Calendar className="h-4 w-4 mr-2" />
                Planificar
              </Link>
            </Button>

            <Button asChild variant="outline" size="sm">
              <Link href="/recipes/add">
                <Plus className="h-4 w-4 mr-2" />
                Añadir
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
