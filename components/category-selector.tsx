"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

interface CategorySelectorProps {
  categories: Category[]
  selectedCategories: number[]
  onCategoriesChange: (categories: number[]) => void
}

export function CategorySelector({ categories, selectedCategories, onCategoriesChange }: CategorySelectorProps) {
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, categoryId])
    } else {
      onCategoriesChange(selectedCategories.filter((id) => id !== categoryId))
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName.trim() })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Categoría creada",
        description: `La categoría "${newCategoryName}" se ha creado correctamente.`,
      })

      // Reset form
      setNewCategoryName("")
      setShowNewCategoryForm(false)

      // Refresh the page to show the new category
      window.location.reload()
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Categorías</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva categoría
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNewCategoryForm && (
          <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/50">
            <Input
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreateCategory()
                }
              }}
            />
            <Button type="button" size="sm" onClick={handleCreateCategory} disabled={isCreating}>
              {isCreating ? "..." : "Crear"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewCategoryForm(false)
                setNewCategoryName("")
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay categorías disponibles.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(Number(category.id))}
                  onCheckedChange={(checked) => handleCategoryChange(Number(category.id), checked as boolean)}
                />
                <Label htmlFor={`category-${category.id}`} className="text-sm font-normal cursor-pointer">
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
