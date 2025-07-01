"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChefHat, Calendar, BookOpen, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Inicio", href: "/", icon: Home },
  { name: "Recetas", href: "/recipes", icon: BookOpen },
  { name: "Planificador", href: "/weekly-menu", icon: Calendar },
]

export default function SimpleNavigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">MenuPlanner</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex space-x-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
