"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { useRouter, useSearchParams } from "next/navigation"

interface MyRecipesCheckboxProps {
  isChecked: boolean
}

export function MyRecipesCheckbox({ isChecked }: MyRecipesCheckboxProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleCheckboxChange = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())

    if (checked) {
      params.set("my", "true")
    } else {
      params.delete("my")
    }

    const newUrl = `/recipes?${params.toString()}`
    router.push(newUrl)
  }

  return (
    <div className="flex items-center space-x-2 ml-4">
      <Checkbox id="show-my-recipes" checked={isChecked} onCheckedChange={handleCheckboxChange} />
      <label
        htmlFor="show-my-recipes"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        Solo las mías
      </label>
    </div>
  )
}
