"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Calendar } from "lucide-react"

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
      icon: BookOpen,
    },
    {
      href: "/weekly-menu",
      label: "Planificar",
      icon: Calendar,
    },
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-lg text-gray-900">MenuPlanner</span>
          </Link>

          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
