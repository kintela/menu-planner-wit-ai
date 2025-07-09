"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  source_url?: string
  video_url?: string
  user_id: string
  recipe_categories?: Array<{
    categories: {
      id: number
      name: string
    }
  }>
}

interface Category {
  id: number
  name: string
}

interface EditRecipeFormProps {
  recipe: Recipe
  categories: Category[]
}

export function EditRecipeForm({ recipe, categories }: EditRecipeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: recipe.name || "",
    ingredients: recipe.ingredients || "",
    preparation: recipe.preparation || "",
    image_url: recipe.image_url || "",
    calories: recipe.calories?.toString() || "",
    source_url: recipe.source_url || "",
    video_url: recipe.video_url || "",
    categories: recipe.recipe_categories?.map((rc) => rc.categories.id.toString()) || [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para editar recetas",
        variant: "destructive",
      })
      return
    }

    console.log("Form submitted - starting handleSubmit")
    setIsSubmitting(true)

    try {
      console.log("Preparing update data...")
      const updateData = {
        name: formData.name,
        ingredients: formData.ingredients,
        preparation: formData.preparation,
        image_url: formData.image_url || null,
        calories: formData.calories ? Number.parseInt(formData.calories) : null,
        source_url: formData.source_url || null,
        video_url: formData.video_url || null,
        categories: formData.categories,
      }

      console.log("Making API request to update recipe...")
      console.log("User ID:", user.id)
      console.log("Recipe ID:", recipe.id)
      console.log("Update data:", updateData)

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(updateData),
      })

      console.log("Response status:", response.status)
      const responseText = await response.text()
      console.log("Response text:", responseText)

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        throw new Error("Invalid response from server")
      }

      if (!response.ok) {
        throw new Error(result.error || "Error updating recipe")
      }

      console.log("Recipe updated successfully:", result)

      toast({
        title: "Éxito",
        description: "Receta actualizada correctamente",
      })

      // Redirect to recipe detail page
      window.location.href = `/recipes/${recipe.id}`
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar la receta",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }))
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Receta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="ingredients">Ingredientes</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData((prev) => ({ ...prev, ingredients: e.target.value }))}
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="preparation">Preparación</Label>
            <Textarea
              id="preparation"
              value={formData.preparation}
              onChange={(e) => setFormData((prev) => ({ ...prev, preparation: e.target.value }))}
              rows={8}
            />
          </div>

          <div>
            <Label htmlFor="calories">Calorías</Label>
            <Input
              id="calories"
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData((prev) => ({ ...prev, calories: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="image_url">URL de imagen</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="source_url">URL de origen</Label>
            <Input
              id="source_url"
              type="url"
              value={formData.source_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, source_url: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="video_url">URL de video</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))}
            />
          </div>

          <div>
            <Label>Categorías</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.id.toString())}
                    onChange={() => handleCategoryChange(category.id.toString())}
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
