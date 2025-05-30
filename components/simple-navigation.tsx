"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ChefHat, PlusCircle, Calendar } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function SimpleNavigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between border-b border-gray-200">
          <div className="flex-shrink-0">
            <Link href="/" className="font-bold text-lg">
              My Recipes
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  pathname === "/" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                Inicio
              </Link>
              <Link
                href="/recipes"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  pathname.startsWith("/recipes")
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                Recetas
              </Link>
              <Link
                href="/weekly-menu"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  pathname === "/weekly-menu"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                Menú Semanal
              </Link>
            </div>
          </div>
          {/* Mobile navigation icons */}
          <div className="md:hidden flex items-center space-x-1">
            <Link href="/recipes" className="p-2" title="Recetas">
              <ChefHat className="h-5 w-5 text-gray-600" />
            </Link>
            <Link href="/recipes/add" className="p-2" title="Añadir Receta">
              <PlusCircle className="h-5 w-5 text-gray-600" />
            </Link>
            <Link href="/weekly-menu" className="p-2" title="Menú Semanal">
              <Calendar className="h-5 w-5 text-gray-600" />
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <span></span>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:w-64">
          <SheetHeader>
            <SheetTitle>Menú</SheetTitle>
            <SheetDescription>Navegación</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col space-y-2">
            <Link
              href="/recipes"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium ${
                pathname.startsWith("/recipes") ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <ChefHat className="h-4 w-4" />
              <span>Recetas</span>
            </Link>
            <Link
              href="/weekly-menu"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md text-base font-medium ${
                pathname === "/weekly-menu" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Calendar className="h-4 w-4" />
              <span>Menú Semanal</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
