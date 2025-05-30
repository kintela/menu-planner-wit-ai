"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function MyRecipesFilter() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState("")
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
        setDebugInfo(`Usuario: ${user ? "✓" : "✗"} | Email: ${user?.email || "N/A"}`)
        console.log("Usuario en cliente:", user ? "SÍ" : "NO", user?.email)
      } catch (error) {
        console.error("Error getting user:", error)
        setDebugInfo(`Error: ${error}`)
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

  // SIEMPRE mostrar para debug
  return (
    <div className="bg-yellow-200 p-2 rounded text-xs">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="my-recipes"
          checked={isChecked}
          onChange={(e) => handleChange(e.target.checked)}
          disabled={!user}
        />
        <label htmlFor="my-recipes" className="text-sm font-medium">
          Solo las mías
        </label>
      </div>
      <div className="text-xs mt-1">{isLoading ? "Cargando..." : debugInfo}</div>
    </div>
  )
}
