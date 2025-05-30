"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import type { Category, Recipe } from "@/lib/types"

interface EditRecipeFormProps {
  recipe: Recipe
  categories: Category[]
  selectedCategoryIds: number[]
}

export function EditRecipeForm({ recipe, categories, selectedCategoryIds }: EditRecipeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: recipe.title || "",
    description: recipe.description || "",
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.join("\n")
      : typeof recipe.ingredients === "string"
        ? recipe.ingredients
        : "",
    instructions: Array.isArray(recipe.instructions)
      ? recipe.instructions.join("\n")
      : typeof recipe.instructions === "string"
        ? recipe.instructions
        : "",
    image_url: recipe.image_url || "",
    preparation_time: recipe.preparation_time || "",
    cooking_time: recipe.cooking_time || "",
    servings: recipe.servings || "",
    difficulty: recipe.difficulty || "medium",
    selectedCategories: selectedCategoryIds || [],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (categoryId: number) => {
    setFormData((prev) => {
      const isSelected = prev.selectedCategories.includes(categoryId)
      if (isSelected) {
        return {
          ...prev,
          selectedCategories: prev.selectedCategories.filter((id) => id !== categoryId),
        }
      } else {
        return {
          ...prev,
          selectedCategories: [...prev.selectedCategories, categoryId],
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = getSupabaseClient()

      // Preparar datos para actualizar
      const ingredients = formData.ingredients
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item !== "")

      const instructions = formData.instructions
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item !== "")

      // Actualizar receta
      const { error } = await supabase
        .from("recipes")
        .update({
          title: formData.title,
          description: formData.description,
          ingredients,
          instructions,
          image_url: formData.image_url,
          preparation_time: formData.preparation_time,
          cooking_time: formData.cooking_time,
          servings: formData.servings,
          difficulty: formData.difficulty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id)

      if (error) throw error

      // Actualizar categorías
      // Primero eliminar todas las categorías existentes
      await supabase.from("recipe_categories").delete().eq("recipe_id", recipe.id)

      // Luego insertar las nuevas categorías seleccionadas
      if (formData.selectedCategories.length > 0) {
        const categoryInserts = formData.selectedCategories.map((categoryId) => ({
          recipe_id: recipe.id,
          category_id: categoryId,
        }))

        const { error: categoryError } = await supabase.from("recipe_categories").insert(categoryInserts)

        if (categoryError) throw categoryError
      }

      toast({
        title: "Receta actualizada",
        description: "La receta se ha actualizado correctamente",
      })

      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la receta",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" value={formData.title} onChange={handleChange} required className="mt-1" />
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="ingredients">Ingredientes (uno por línea)</Label>
          <Textarea
            id="ingredients"
            name="ingredients"
            value={formData.ingredients}
            onChange={handleChange}
            className="mt-1"
            rows={5}
            required
          />
        </div>

        <div>
          <Label htmlFor="instructions">Instrucciones (una por línea)</Label>
          <Textarea
            id="instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            className="mt-1"
            rows={5}
            required
          />
        </div>

        <div>
          <Label htmlFor="image_url">URL de la imagen</Label>
          <Input id="image_url" name="image_url" value={formData.image_url} onChange={handleChange} className="mt-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="preparation_time">Tiempo de preparación (min)</Label>
            <Input
              id="preparation_time"
              name="preparation_time"
              type="number"
              value={formData.preparation_time}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cooking_time">Tiempo de cocción (min)</Label>
            <Input
              id="cooking_time"
              name="cooking_time"
              type="number"
              value={formData.cooking_time}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="servings">Porciones</Label>
            <Input
              id="servings"
              name="servings"
              type="number"
              value={formData.servings}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="difficulty">Dificultad</Label>
          <select
            id="difficulty"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          >
            <option value="easy">Fácil</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
          </select>
        </div>

        <div>
          <Label>Categorías</Label>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`category-${category.id}`}
                  checked={formData.selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryChange(category.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor={`category-${category.id}`} className="ml-2 block text-sm text-gray-900">
                  {category.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
  )
}
