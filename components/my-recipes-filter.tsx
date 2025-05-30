"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"

export function MyRecipesFilter() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [supabase])

  const showOnlyMyRecipes = searchParams.get("my") === "true"

  const handleCheckboxChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (checked) {
      params.set("my", "true")
    } else {
      params.delete("my")
    }
    router.push(`/recipes?${params.toString()}`)
  }

  if (loading) {
    return null // No mostrar nada mientras carga
  }

  if (!user) {
    return null // No mostrar si no hay usuario
  }

  return (
    <div className="flex items-center space-x-2 ml-4">
      <input
        type="checkbox"
        id="show-my-recipes"
        checked={showOnlyMyRecipes}
        onChange={(e) => handleCheckboxChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="show-my-recipes" className="text-sm font-medium cursor-pointer">
        Solo las mías
      </label>
    </div>
  )
}
