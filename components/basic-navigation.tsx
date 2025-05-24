"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, ChefHat, History, Home, PlusCircle, Settings } from "lucide-react"

export function BasicNavigation() {
  const pathname = usePathname()

  // Función para determinar si un enlace está activo
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  // Estilos para los enlaces
  const baseStyles = "flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
  const activeStyles = "bg-primary text-primary-foreground"
  const inactiveStyles = "text-foreground hover:bg-muted"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container mx-auto px-4">
        <nav className="flex items-center h-16 overflow-x-auto">
          <ul className="flex space-x-2">
            <li>
              <Link href="/" className={`${baseStyles} ${isActive("/") ? activeStyles : inactiveStyles}`}>
                <Home className="mr-2 h-4 w-4" />
                Inicio
              </Link>
            </li>
            <li>
              <Link
                href="/weekly-menu"
                className={`${baseStyles} ${isActive("/weekly-menu") ? activeStyles : inactiveStyles}`}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Menú Semanal
              </Link>
            </li>
            <li>
              <Link
                href="/recipes"
                className={`${baseStyles} ${
                  isActive("/recipes") && !pathname.includes("/add") ? activeStyles : inactiveStyles
                }`}
              >
                <ChefHat className="mr-2 h-4 w-4" />
                Recetas
              </Link>
            </li>
            <li>
              <Link
                href="/recipes/add"
                className={`${baseStyles} ${isActive("/recipes/add") ? activeStyles : inactiveStyles}`}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Receta
              </Link>
            </li>
            <li>
              <Link
                href="/categories"
                className={`${baseStyles} ${isActive("/categories") ? activeStyles : inactiveStyles}`}
              >
                <Settings className="mr-2 h-4 w-4" />
                Categorías
              </Link>
            </li>
            <li>
              <Link href="/history" className={`${baseStyles} ${isActive("/history") ? activeStyles : inactiveStyles}`}>
                <History className="mr-2 h-4 w-4" />
                Historial
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
