"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function SimpleCheckbox() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  return (
    <div className="flex items-center space-x-2 ml-4 bg-red-200 p-2 rounded">
      <input
        type="checkbox"
        id="show-my-recipes-simple"
        checked={showOnlyMyRecipes}
        onChange={(e) => handleCheckboxChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="show-my-recipes-simple" className="text-sm font-medium cursor-pointer">
        Solo las mías (SIEMPRE VISIBLE)
      </label>
    </div>
  )
}
