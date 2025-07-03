"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Category } from "@/lib/types"

interface CategorySelectorProps {
  categories: Category[]
  selectedCategories: number[]
  onCategoriesChange: (categories: number[]) => void
}

export function CategorySelector({ categories, selectedCategories, onCategoriesChange }: CategorySelectorProps) {
  const [showAll, setShowAll] = useState(false)

  const handleCategoryToggle = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoriesChange(selectedCategories.filter((id) => id !== categoryId))
    } else {
      onCategoriesChange([...selectedCategories, categoryId])
    }
  }

  const displayedCategories = showAll ? categories : categories.slice(0, 6)

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorías</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No hay categorías disponibles. Puedes añadir la receta sin categorías.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {displayedCategories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => handleCategoryToggle(category.id)}
              />
              <Label htmlFor={`category-${category.id}`} className="text-sm font-normal cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))}
        </div>

        {categories.length > 6 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
            {showAll ? "Mostrar menos" : `Mostrar todas (${categories.length})`}
          </Button>
        )}

        {selectedCategories.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Categorías seleccionadas:</Label>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId)
                return category ? (
                  <Badge key={categoryId} variant="secondary" className="text-xs">
                    {category.name}
                  </Badge>
                ) : null
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
