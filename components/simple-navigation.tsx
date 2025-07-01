"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ChefHat, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export function SimpleNavigation() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/",
      label: "Inicio",
      icon: Home,
    },
    {
      href: "/recipes",
      label: "Recetas",
      icon: ChefHat,
    },
    {
      href: "/weekly-menu",
      label: "Planificar",
      icon: Calendar,
    },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <ChefHat className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">MenuPlanner</span>
        </Link>

        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
