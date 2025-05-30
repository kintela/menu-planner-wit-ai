"use client"

import type React from "react"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AiRecipeSuggestion } from "@/components/ai-recipe-suggestion"

interface Recipe {
  id: string
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  mealType: string
}

interface WeeklyMenuViewProps {
  recipes: Recipe[]
  onRecipeChange: (day: number, meal: string, dishOrder: number, recipeId: string) => void
  selectedRecipes: { [day: number]: { [meal: string]: { [dishOrder: number]: string | null } } }
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>
}

const WeeklyMenuView: React.FC<WeeklyMenuViewProps> = ({ recipes, onRecipeChange, selectedRecipes, setRecipes }) => {
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
  const mealOptions = ["Desayuno", "Almuerzo", "Cena"]
  const dishOrders = [1, 2]

  const handleRecipeChange = (day: number, meal: string, dishOrder: number, recipeId: string) => {
    onRecipeChange(day, meal, dishOrder, recipeId)
  }

  return (
    <Table>
      <TableCaption>Menú Semanal</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Día</TableHead>
          <TableHead>Comida</TableHead>
          <TableHead>Plato</TableHead>
          <TableHead>Receta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {dayNames.map((dayName, day) =>
          mealOptions.map((meal, mealIndex) =>
            dishOrders.map((dishOrder, dishOrderIndex) => (
              <TableRow key={`${day}-${meal}-${dishOrder}`}>
                <TableCell>{dayName}</TableCell>
                <TableCell>{meal}</TableCell>
                <TableCell>{dishOrder}</TableCell>
                <TableCell>
                  <Select
                    value={selectedRecipes[day]?.[meal]?.[dishOrder] || ""}
                    onValueChange={(recipeId) => handleRecipeChange(day, meal, dishOrder, recipeId)}
                  >
                    <option value="">Selecciona una receta</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const recipeId = selectedRecipes[day]?.[meal]?.[dishOrder]
                      if (recipeId) {
                        window.open(`/recipes/${recipeId}`, "_blank")
                      }
                    }}
                  >
                    Ver receta
                  </Button>
                  {/* Botón de sugerencias de IA */}
                  <div className="mt-2">
                    <AiRecipeSuggestion
                      onRecipeCreated={(newRecipe) => {
                        // Actualizar la lista de recetas
                        setRecipes((prev) => [...prev, newRecipe])
                        // Seleccionar automáticamente la nueva receta
                        handleRecipeChange(day, meal, dishOrder || 1, newRecipe.id.toString())
                      }}
                      mealType={meal}
                      dishOrder={dishOrder}
                      dayName={dayNames[day]}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )),
          ),
        )}
      </TableBody>
    </Table>
  )
}

export default WeeklyMenuView
