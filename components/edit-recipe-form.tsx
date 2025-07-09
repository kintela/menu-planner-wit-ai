"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  image_url: string | null
  calories: number | null
  source_url: string | null
  video_url: string | null
  categories: { id: number; name: string }[]
}

interface Category {
  id: number
  name: string
}

interface EditRecipeFormProps {
  recipe: Recipe
}

export default function EditRecipeForm({ recipe }: EditRecipeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useSession()

  const [formData, setFormData] = useState({
    name: recipe.name || "",
    ingredients: recipe.ingredients || "",
    preparation: recipe.preparation || "",
    image_url: recipe.image_url || "",
    calories: recipe.calories || "",
    source_url: recipe.source_url || "",
    video_url: recipe.video_url || "",
    categories: recipe.categories?.map((c) => c.id) || [],
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to edit recipes",
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
        calories: formData.calories ? Number.parseInt(formData.calories.toString()) : null,
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

      let responseData
      try {
        const responseText = await response.text()
        console.log("Response text:", responseText)
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        throw new Error("Invalid response from server")
      }

      console.log("Response data:", responseData)

      if (response.ok && responseData.success) {
        toast({
          title: "Success",
          description: "Recipe updated successfully",
        })

        console.log("Redirecting to recipe detail...")
        window.location.href = `/recipes/${recipe.id}`
      } else {
        throw new Error(responseData.error || "Failed to update recipe")
      }
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update recipe",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      categories: checked ? [...prev.categories, categoryId] : prev.categories.filter((id) => id !== categoryId),
    }))
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Recipe</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Recipe Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="ingredients">Ingredients</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData((prev) => ({ ...prev, ingredients: e.target.value }))}
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="preparation">Preparation</Label>
            <Textarea
              id="preparation"
              value={formData.preparation}
              onChange={(e) => setFormData((prev) => ({ ...prev, preparation: e.target.value }))}
              rows={6}
            />
          </div>

          <div>
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData((prev) => ({ ...prev, calories: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="source_url">Source URL</Label>
            <Input
              id="source_url"
              type="url"
              value={formData.source_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, source_url: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="video_url">Video URL</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, video_url: e.target.value }))}
            />
          </div>

          {categories.length > 0 && (
            <div>
              <Label>Categories</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.categories.includes(category.id)}
                      onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Recipe"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
