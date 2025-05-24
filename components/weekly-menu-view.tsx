"use client"

import { useState } from "react"
import type { Recipe } from "@/types"
import { Select } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WeeklyMenuViewProps {
  recipes: Recipe[]
  weeklyMenu: {
    day: string
    dayName: string
    comida: { dish1: string; dish2: string }
    cena: string
  }[]
  handleRecipeChange: (day: string, meal: string, recipeId: string, dishOrder?: number) => void
  onRegenerateMenu: () => Promise<void>
}

export function WeeklyMenuView({ recipes, weeklyMenu, handleRecipeChange, onRegenerateMenu }: WeeklyMenuViewProps) {
  const { toast } = useToast()
  const [newRecipeName, setNewRecipeName] = useState("")
  const [newRecipeType, setNewRecipeType] = useState("")
  const [open, setOpen] = useState(false)

  const handleCreateRecipe = async () => {
    if (!newRecipeName || !newRecipeType) {
      toast({
        title: "Error",
        description: "Please fill all the fields",
      })
      return
    }

    const newRecipe = {
      id: crypto.randomUUID(),
      name: newRecipeName,
      type: newRecipeType,
      ingredients: [],
      instructions: [],
    }

    // Optimistically update the recipes state
    setRecipes((prevRecipes) => [...prevRecipes, newRecipe])

    // Reset the form and close the dialog
    setNewRecipeName("")
    setNewRecipeType("")
    setOpen(false)

    toast({
      title: "Success",
      description: "Recipe created successfully",
    })
  }

  return (
    <ScrollArea className="h-[60vh] w-full rounded-md border">
      <div className="p-4">
        <div className="grid gap-4">
          {weeklyMenu.map((dayMenu) => (
            <div key={dayMenu.day} className="grid gap-2">
              <h3 className="font-semibold">{dayMenu.dayName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Primer plato</h4>
                  <Select
                    onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 1)}
                    defaultValue={dayMenu.comida.dish1}
                  >
                    <option value="">Selecciona un plato</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Segundo plato</h4>
                  <Select
                    onValueChange={(value) => handleRecipeChange(dayMenu.day, "comida", value, 2)}
                    defaultValue={dayMenu.comida.dish2}
                  >
                    <option value="">Selecciona un plato</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Cena</h4>
                  <Select
                    onValueChange={(value) => handleRecipeChange(dayMenu.day, "cena", value)}
                    defaultValue={dayMenu.cena}
                  >
                    <option value="">Selecciona un plato</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Añadir receta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Añadir nueva receta</AlertDialogTitle>
                <AlertDialogDescription>Añade una nueva receta a la lista</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Tipo
                  </Label>
                  <Input
                    id="type"
                    value={newRecipeType}
                    onChange={(e) => setNewRecipeType(e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateRecipe}>Continuar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={onRegenerateMenu}>Regenerar menú</Button>
        </div>
      </div>
    </ScrollArea>
  )
}
