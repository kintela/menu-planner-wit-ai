"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth/auth-provider"

interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  source_url?: string
  video_url?: string
  calories?: number
  servings?: number
  difficulty?: string
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
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: recipe.name || "",
    ingredients: recipe.ingredients || "",
    preparation: recipe.preparation || "",
    image_url: recipe.image_url || "",
    source_url: recipe.source_url || "",
    video_url: recipe.video_url || "",
    calories: recipe.calories || 0,
    servings: recipe.servings || 1,
    difficulty: recipe.difficulty || "medium",
    selectedCategories: recipe.recipe_categories?.map((rc) => rc.categories.id) || [],
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
    console.log("Preparing update data...")

    setIsSubmitting(true)

    try {
      console.log("Making API request to update recipe...")
      console.log("User ID:", user.id)
      console.log("Recipe ID:", recipe.id)

      const updateData = {
        name: formData.name,
        ingredients: formData.ingredients,
        preparation: formData.preparation,
        image_url: formData.image_url || null,
        source_url: formData.source_url || null,
        video_url: formData.video_url || null,
        calories: formData.calories || null,
        servings: formData.servings || null,
        difficulty: formData.difficulty,
        categories: formData.selectedCategories,
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(updateData),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error updating recipe")
      }

      const result = await response.json()
      console.log("Update successful:", result)

      toast({
        title: "Éxito",
        description: "Receta actualizada correctamente",
      })

      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (error: any) {
      console.error("Error updating recipe:", error)

      if (error.name === "AbortError") {
        toast({
          title: "Error",
          description: "La operación tardó demasiado tiempo. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Error al actualizar la receta",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: checked
        ? [...prev.selectedCategories, categoryId]
        : prev.selectedCategories.filter((id) => id !== categoryId),
    }))
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Receta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre de la receta *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="servings">Porciones</Label>
                <Input
                  id="servings"
                  type="number"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => handleInputChange("servings", Number.parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label htmlFor="calories">Calorías</Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  value={formData.calories}
                  onChange={(e) => handleInputChange("calories", Number.parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="difficulty">Dificultad</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="image_url">URL de la imagen</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange("image_url", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="source_url">URL de la fuente</Label>
                <Input
                  id="source_url"
                  type="url"
                  value={formData.source_url}
                  onChange={(e) => handleInputChange("source_url", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="video_url">URL del video</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => handleInputChange("video_url", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="ingredients">Ingredientes</Label>
                <Textarea
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={(e) => handleInputChange("ingredients", e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div>
                <Label htmlFor="preparation">Preparación</Label>
                <Textarea
                  id="preparation"
                  value={formData.preparation}
                  onChange={(e) => handleInputChange("preparation", e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <Label>Categorías</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`category-${category.id}`}
                          checked={formData.selectedCategories.includes(category.id)}
                          onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor={`category-${category.id}`} className="text-sm">
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
