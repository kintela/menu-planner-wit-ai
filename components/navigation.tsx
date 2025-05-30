"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { User, LogOut, Menu, X, Home, Book, Calendar, Plus, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"

export function Navigation() {
  // ... resto del código del componente
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    fetchUser()
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleSignOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="bg-gray-800 text-white py-4">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold">
          Taskify
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <Link href="/" className="hover:text-gray-300 flex items-center">
            <Home className="mr-1 h-5 w-5" />
            Home
          </Link>
          <Link href="/projects" className="hover:text-gray-300 flex items-center">
            <Book className="mr-1 h-5 w-5" />
            Projects
          </Link>
          <Link href="/calendar" className="hover:text-gray-300 flex items-center">
            <Calendar className="mr-1 h-5 w-5" />
            Calendar
          </Link>
          <Link href="/create" className="hover:text-gray-300 flex items-center">
            <Plus className="h-5 w-5" />
          </Link>
          <Link href="/search" className="hover:text-gray-300 flex items-center">
            <Search className="mr-1 h-5 w-5" />
            Search
          </Link>
          {user ? (
            <>
              <Link href="/settings" className="hover:text-gray-300 flex items-center">
                <Settings className="mr-1 h-5 w-5" />
                Settings
              </Link>
              <Button variant="ghost" className="hover:text-gray-300 flex items-center" onClick={handleSignOut}>
                <LogOut className="mr-1 h-5 w-5" />
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login" className="hover:text-gray-300 flex items-center">
              <User className="mr-1 h-5 w-5" />
              Login
            </Link>
          )}
        </div>

        <div className="md:hidden">
          <button onClick={toggleMenu}>{isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-gray-700 py-2">
          <div className="container mx-auto flex flex-col space-y-2">
            <Link href="/" className="hover:text-gray-300 flex items-center">
              <Home className="mr-1 h-5 w-5" />
              Home
            </Link>
            <Link href="/projects" className="hover:text-gray-300 flex items-center">
              <Book className="mr-1 h-5 w-5" />
              Projects
            </Link>
            <Link href="/calendar" className="hover:text-gray-300 flex items-center">
              <Calendar className="mr-1 h-5 w-5" />
              Calendar
            </Link>
            <Link href="/create" className="hover:text-gray-300 flex items-center">
              <Plus className="h-5 w-5" />
            </Link>
            <Link href="/search" className="hover:text-gray-300 flex items-center">
              <Search className="mr-1 h-5 w-5" />
              Search
            </Link>
            {user ? (
              <>
                <Link href="/settings" className="hover:text-gray-300 flex items-center">
                  <Settings className="mr-1 h-5 w-5" />
                  Settings
                </Link>
                <Button variant="ghost" className="hover:text-gray-300 flex items-center" onClick={handleSignOut}>
                  <LogOut className="mr-1 h-5 w-5" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login" className="hover:text-gray-300 flex items-center">
                <User className="mr-1 h-5 w-5" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
