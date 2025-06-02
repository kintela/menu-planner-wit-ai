"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserProfileForm } from "@/components/user-profile-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ChangePasswordForm } from "@/components/change-password-form"


export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.log("No user found, redirecting to login")
        router.push("/login")
        return
      }

      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-10 max-w-2xl">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando perfil...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container py-10 max-w-2xl">
        <div className="text-center p-8">
          <p>Debes iniciar sesión para ver tu perfil</p>
          <Link href="/login">
            <Button className="mt-4">Iniciar Sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-10 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
      </div>

      <div className="space-y-6">
        <UserProfileForm />

        <ChangePasswordForm />

      </div>
    </div>
  )
}
