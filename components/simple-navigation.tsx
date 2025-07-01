"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ChefHat, Calendar, Plus } from "lucide-react"

export default function SimpleNavigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/recipes", label: "Recetas", icon: ChefHat },
    { href: "/weekly-menu", label: "Menú", icon: Calendar },
    { href: "/recipes/add", label: "Añadir", icon: Plus },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl text-blue-600">
            MenuPlanner
          </Link>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
