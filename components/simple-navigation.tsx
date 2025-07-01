"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChefHat, Menu, X, Calendar, BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function SimpleNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: "Inicio", href: "/", icon: ChefHat },
    { name: "Recetas", href: "/recipes", icon: BookOpen },
    { name: "Planificar", href: "/weekly-menu", icon: Calendar },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">MenuPlanner</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.name}
                  variant={isActive(item.href) ? "default" : "ghost"}
                  asChild
                  className="flex items-center space-x-2"
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.name}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    asChild
                    className="justify-start"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
