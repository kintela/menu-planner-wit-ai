"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, Calendar } from "lucide-react"

export default function SimpleNavigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4">
      <Link
        href="/"
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          pathname === "/" ? "bg-blue-600 text-white" : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
        }`}
      >
        <Home className="w-4 h-4 mr-2" />
        Inicio
      </Link>
      <Link
        href="/recipes"
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          pathname === "/recipes" ? "bg-blue-600 text-white" : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
        }`}
      >
        <List className="w-4 h-4 mr-2" />
        Recetas
      </Link>
      <Link
        href="/plan"
        className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          pathname === "/plan" ? "bg-blue-600 text-white" : "text-gray-700 hover:text-blue-600 hover:bg-gray-100"
        }`}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Planificar
      </Link>
    </nav>
  )
}
\`\`\`
