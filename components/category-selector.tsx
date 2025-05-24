"use client"

import { useState, useEffect } from "react"
import { PlusCircle } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface CategorySelectorProps {
  categories: Category[]
  selectedCategories: number[]
  onCategoriesChange: (categories: number[]) => void
}

export function CategorySelector({
  categories: initialCategories,
  selectedCategories,
  onCategoriesChange,
}: CategorySelectorProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Efecto para actualizar las categorías cuando cambian las props
  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  // Efecto para depuración
  useEffect(() => {
    console.log("CategorySelector - Categories:", categories)
    console.log("CategorySelector - Selected Categories:", selectedCategories)
  }, [categories, selectedCategories])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, categoryId])
    } else {
      onCategoriesChange(selectedCategories.filter((id) => id !== categoryId))
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor, introduce un nombre para la categoría.",
        variant: "destructive",
      })
      return
    }

    setIsAddingCategory(true)

    try {
      const supabase = getSupabaseClient()

      // Normalizar el nombre para la comparación (sin espacios extra, en minúsculas)
      const normalizedName = newCategoryName.trim().toLowerCase()

      // Comprobar si la categoría ya existe (comparación insensible a mayúsculas/minúsculas)
      const existingCategory = categories.find((category) => category.name.toLowerCase() === normalizedName)

      if (existingCategory) {
        toast({
          title: "Categoría existente",
          description: `Ya existe una categoría llamada "${existingCategory.name}".`,
          variant: "destructive",
        })
        setIsAddingCategory(false)
        return
      }

      // Insertar la nueva categoría con el nombre original (manteniendo mayúsculas/minúsculas)
      const { data: newCategory, error } = await supabase
        .from("categories")
        .insert({ name: newCategoryName.trim() })
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista de categorías
      setCategories([...categories, newCategory])

      // Seleccionar la nueva categoría
      onCategoriesChange([...selectedCategories, newCategory.id])

      toast({
        title: "Categoría añadida",
        description: `La categoría "${newCategoryName.trim()}" ha sido añadida.`,
      })

      // Limpiar el formulario
      setNewCategoryName("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Error",
        description: "Ha ocurrido un error al añadir la categoría.",
        variant: "destructive",
      })
    } finally {
      setIsAddingCategory(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base">Categorías</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir nueva categoría</DialogTitle>
              <DialogDescription>Crea una nueva categoría para clasificar tus recetas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nombre de la categoría</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ej: Postres, Vegetariano, Sin gluten..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCategory} disabled={isAddingCategory}>
                {isAddingCategory ? "Añadiendo..." : "Añadir categoría"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {categories && categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
              />
              <Label htmlFor={`category-${category.id}`} className="cursor-pointer">
                {category.name}
              </Label>
            </div>
          ))
        ) : (
          <p className="col-span-full text-muted-foreground">No hay categorías disponibles.</p>
        )}
      </div>
    </div>
  )
}
