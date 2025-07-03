"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface MyRecipesFilterProps {
  showMyRecipes: boolean
  onToggle: (show: boolean) => void
}

export function MyRecipesFilter({ showMyRecipes, onToggle }: MyRecipesFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox id="my-recipes" checked={showMyRecipes} onCheckedChange={(checked) => onToggle(checked as boolean)} />
      <Label htmlFor="my-recipes" className="cursor-pointer">
        Solo mis recetas
      </Label>
    </div>
  )
}
