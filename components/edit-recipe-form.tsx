"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import type { Recipe, Category } from "@/lib/types"
import { getSupabaseClient } from "@/lib/supabase/client"

interface EditRecipeFormProps {
  recipe: Recipe
  categories: Category[]
  selectedCategoryIds: number[]
}

export function EditRecipeForm({ recipe, categories, selectedCategoryIds }: EditRecipeFormProps) {
  const router = useRouter()
  const { user, session, loading: authLoading } = useAuth()

  // Form states
  const [name, setName] = useState(recipe.name || "")
  const [ingredients, setIngredients] = useState(recipe.ingredients || "")
  const [preparation, setPreparation] = useState(recipe.preparation || "")
  const [imageUrl, setImageUrl] = useState(recipe.image_url || "")
  const [calories, setCalories] = useState(recipe.calories?.toString() || "")
  const [sourceUrl, setSourceUrl] = useState(recipe.source_url || "")
  const [videoUrl, setVideoUrl] = useState(recipe.video_url || "")
  const [selectedCategories, setSelectedCategories] = useState<number[]>(selectedCategoryIds)

  // Component states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState<boolean | null>(null)

  // Check authentication and permissions
  useEffect(() => {
    async function checkPermissions() {
      console.log("Checking permissions - authLoading:", authLoading, "user:", user, "session:", session)

      if (authLoading) {
        console.log("Still loading auth state...")
        return
      }

      // If no user, redirect to login
      if (!user || !session) {
        console.log("No user or session found, redirecting to login")
        router.push(`/login?redirect=/recipes/${recipe.id}/edit`)
        return
      }

      console.log("User authenticated:", user.id, "Recipe owner:", recipe.user_id)

      try {
        const supabase = getSupabaseClient()

        // Check if user is the owner
        const isOwner = recipe.user_id === user.id
        console.log("Is owner:", isOwner)

        // Check if user is admin
        let isAdmin = false
        try {
          const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
          isAdmin = profile?.role === "admin"
          console.log("Is admin:", isAdmin, "Profile:", profile)
        } catch (err) {
          console.error("Error checking admin status:", err)
        }

        const hasPermission = isOwner || isAdmin
        console.log("Has permission:", hasPermission)
        setCanEdit(hasPermission)

        if (!hasPermission) {
          setError("No tienes permisos para editar esta receta")
        }
      } catch (err) {
        console.error("Error checking permissions:", err)
        setError("Error al verificar permisos")
      }
    }

    checkPermissions()
  }, [user, session, authLoading, recipe.id, recipe.user_id, router])

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !session) {
      console.log("No user or session in handleSubmit, redirecting to login")
      router.push(`/login?redirect=/recipes/${recipe.id}/edit`)
      return
    }

    if (canEdit === false) {
      setError("No tienes permisos para editar esta receta")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const updateData = {
        name: name.trim(),
        ingredients: ingredients.trim(),
        preparation: preparation.trim(),
        image_url: imageUrl.trim() || null,
        calories: calories ? Number.parseInt(calories) : null,
        source_url: sourceUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        categories: selectedCategories,
      }

      console.log("Submitting update with session token:", session.access_token ? "Present" : "Missing")

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar la receta")
      }

      router.push(`/recipes/${recipe.id}`)
    } catch (err) {
      console.error("Error updating recipe:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar la receta")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (authLoading || canEdit === null) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Verificando permisos...</span>
        </div>
      </div>
    )
  }

  // Show error if no permissions
  if (canEdit === false || error) {
    return (
      <div className="container py-10">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
              <CardDescription>{error || "No tienes permisos para editar esta receta"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/recipes">Volver a recetas</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" size="sm">
              <Link href={`/recipes/${recipe.id}`} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <CardTitle>Editar Receta</CardTitle>
            <div className="w-20"></div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la receta *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Paella valenciana"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredientes *</Label>
              <Textarea
                id="ingredients"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Lista los ingredientes necesarios..."
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preparation">Preparación *</Label>
              <Textarea
                id="preparation"
                value={preparation}
                onChange={(e) => setPreparation(e.target.value)}
                placeholder="Describe los pasos para preparar la receta..."
                className="min-h-[150px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calories">Calorías (opcional)</Label>
              <Input
                id="calories"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="Ej: 350"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL de imagen (opcional)</Label>
              <Input
                id="image_url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_url">URL de origen (opcional)</Label>
              <Input
                id="source_url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.ejemplo.com/receta-original"
              />
              <p className="text-sm text-gray-500">Añade un enlace a la página web de donde has obtenido esta receta</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url">URL del video (opcional)</Label>
              <Input
                id="video_url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-sm text-gray-500">
                Añade un enlace a un video que muestre cómo preparar esta receta (YouTube, Vimeo, etc.)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Categorías</Label>
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva categoría
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                    />
                    <Label htmlFor={`category-${category.id}`} className="text-sm">
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500">* Los campos marcados con asterisco son obligatorios</p>

            <div className="flex gap-4">
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href={`/recipes/${recipe.id}`}>Cancelar</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando cambios...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
