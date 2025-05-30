"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function MyRecipesFilter() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  const isChecked = searchParams.get("my") === "true"

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        console.log("Usuario en cliente:", user ? "SÍ" : "NO", user?.email)
      } catch (error) {
        console.error("Error getting user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [supabase])

  const handleChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())

    if (checked) {
      params.set("my", "true")
    } else {
      params.delete("my")
    }

    router.push(`/recipes?${params.toString()}`)
  }

  // Solo mostrar si hay usuario autenticado
  if (isLoading || !user) {
    return null
  }

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="my-recipes" checked={isChecked} onCheckedChange={handleChange} />
      <Label htmlFor="my-recipes" className="text-sm font-medium">
        Solo las mías
      </Label>
    </div>
  )
}
