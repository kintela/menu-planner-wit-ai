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
import type { Recipe, Category } from "@/lib/types"

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
    prep_time: recipe.prep_time || 0,
    cook_time: recipe.cook_time || 0,
    servings: recipe.servings || 1,
    difficulty: recipe.difficulty || "easy",
    image_url: recipe.image_url || "",
    source_url: recipe.source_url || "",
    video_url: recipe.video_url || "",
    calories: recipe.calories || 0,
    category_ids: recipe.recipe_categories?.map((rc: any) => rc.categories?.id).filter(Boolean) || [],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
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

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(formData),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error updating recipe")
      }

      const updatedRecipe = await response.json()
      console.log("✅ Recipe updated successfully:", updatedRecipe)

      toast({
        title: "Éxito",
        description: "Receta actualizada correctamente",
      })

      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (error: any) {
      console.error("❌ Error updating recipe:", error)

      if (error.name === "AbortError") {
        toast({
          title: "Error",
          description: "La petición tardó demasiado tiempo. Inténtalo de nuevo.",
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="ingredients">Ingredientes</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="preparation">Preparación</Label>
            <Textarea
              id="preparation"
              value={formData.preparation}
              onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
              rows={8}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prep_time">Tiempo de preparación (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={formData.prep_time}
                onChange={(e) => setFormData({ ...formData, prep_time: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="cook_time">Tiempo de cocción (min)</Label>
              <Input
                id="cook_time"
                type="number"
                value={formData.cook_time}
                onChange={(e) => setFormData({ ...formData, cook_time: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="servings">Porciones</Label>
              <Input
                id="servings"
                type="number"
                value={formData.servings}
                onChange={(e) => setFormData({ ...formData, servings: Number.parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Dificultad</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
              >
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
          </div>

          <div>
            <Label htmlFor="calories">Calorías</Label>
            <Input
              id="calories"
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData({ ...formData, calories: Number.parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Label htmlFor="image_url">URL de imagen</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="source_url">URL de origen</Label>
            <Input
              id="source_url"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="video_url">URL de video</Label>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
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
