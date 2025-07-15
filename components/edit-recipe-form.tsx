"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import { getSupabaseClient } from "@/lib/supabase/client"

interface Category {
  id: string
  name: string
}

interface Recipe {
  id: string
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  calories?: number
  source_url?: string
  video_url?: string
  user_id: string
  recipe_categories?: {
    categories: Category
  }[]
}

interface EditRecipeFormProps {
  recipe: Recipe
  categories: Category[]
}

export function EditRecipeForm({ recipe, categories }: EditRecipeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useSession()

  const [formData, setFormData] = useState({
    name: recipe.name || "",
    ingredients: recipe.ingredients || "",
    preparation: recipe.preparation || "",
    image_url: recipe.image_url || "",
    calories: recipe.calories?.toString() || "",
    source_url: recipe.source_url || "",
    video_url: recipe.video_url || "",
  })

  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (recipe.recipe_categories) {
      const categoryIds = recipe.recipe_categories.map((rc) => rc.categories.id)
      setSelectedCategories(categoryIds)
    }
  }, [recipe])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCategoryAdd = (categoryId: string) => {
    if (!selectedCategories.includes(categoryId)) {
      setSelectedCategories((prev) => [...prev, categoryId])
    }
  }

  const handleCategoryRemove = (categoryId: string) => {
    setSelectedCategories((prev) => prev.filter((id) => id !== categoryId))
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setUploadingImage(true)
    try {
      const supabase = getSupabaseClient()
      const fileExt = file.name.split(".").pop()
      const fileName = `recipe-${recipe.id}-${Date.now()}.${fileExt}` // solo el nombre, sin carpeta
      const filePath = fileName
      console.log("[SUBIDA] Intentando subir imagen:", filePath, file)
      const { error: uploadError } = await supabase.storage.from("recipe-images").upload(filePath, file, { upsert: true })
      if (uploadError) {
        console.error("[SUBIDA] Error al subir imagen:", uploadError)
        toast({ title: "Error al subir imagen", description: uploadError.message || "Error desconocido", variant: "destructive" })
        return
      }
      const { data, error: urlError } = supabase.storage.from("recipe-images").getPublicUrl(filePath)
      if (urlError) {
        console.error("[SUBIDA] Error al obtener URL pública:", urlError)
        toast({ title: "Error al obtener URL de imagen", description: urlError.message || "Error desconocido", variant: "destructive" })
        return
      }
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }))
      toast({ title: "Imagen subida", description: "La imagen se subió correctamente." })
      console.log("[SUBIDA] Imagen subida y URL pública:", data.publicUrl)
    } catch (err: any) {
      console.error("[SUBIDA] Excepción inesperada:", err)
      toast({ title: "Error inesperado al subir imagen", description: err?.message || "Error desconocido", variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }

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
        ...formData,
        categories: selectedCategories.map((id) => Number.parseInt(id)),
      }

      console.log("Making API request to update recipe...")
      console.log("User ID:", user.id)
      console.log("Recipe ID:", recipe.id)
      console.log("Update data:", updateData)

      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

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
      console.log("Response status:", response.status)

      let responseData
      try {
        const responseText = await response.text()
        console.log("Raw response:", responseText)
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        throw new Error("Invalid response from server")
      }

      console.log("Parsed response data:", responseData)

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update recipe")
      }

      if (responseData.success) {
        toast({
          title: "¡Éxito!",
          description: "Receta actualizada correctamente",
        })

        console.log("Redirecting to recipe detail...")
        window.location.href = `/recipes/${recipe.id}`
      } else {
        throw new Error("Update failed")
      }
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
          description: error instanceof Error ? error.message : "Error al actualizar la receta",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getSelectedCategoryNames = () => {
    return selectedCategories.map((id) => categories.find((cat) => cat.id === id)?.name).filter(Boolean)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Receta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <Label htmlFor="ingredients">Ingredientes</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => handleInputChange("ingredients", e.target.value)}
              rows={6}
              placeholder="Lista los ingredientes..."
            />
          </div>

          <div>
            <Label htmlFor="preparation">Preparación</Label>
            <Textarea
              id="preparation"
              value={formData.preparation}
              onChange={(e) => handleInputChange("preparation", e.target.value)}
              rows={8}
              placeholder="Describe los pasos de preparación..."
            />
          </div>

          <div>
            <Label htmlFor="calories">Calorías (por porción)</Label>
            <Input
              id="calories"
              type="number"
              value={formData.calories}
              onChange={(e) => handleInputChange("calories", e.target.value)}
              placeholder="Ej: 250"
            />
          </div>

          <div>
            <Label htmlFor="image_file">Imagen de la receta</Label>
            <Input
              id="image_file"
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              disabled={uploadingImage}
            />
            {uploadingImage && <span className="text-xs text-blue-600">Subiendo imagen...</span>}
            {formData.image_url && (
              <div className="mt-2">
                <img src={formData.image_url} alt="Imagen de la receta" className="max-h-40 rounded" />
                <div className="text-xs text-gray-500 break-all">{formData.image_url}</div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="source_url">URL de origen</Label>
            <Input
              id="source_url"
              type="url"
              value={formData.source_url}
              onChange={(e) => handleInputChange("source_url", e.target.value)}
              placeholder="https://ejemplo.com/receta-original"
            />
          </div>

          <div>
            <Label htmlFor="video_url">URL de video</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url}
              onChange={(e) => handleInputChange("video_url", e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <Label>Categorías</Label>
            <Select onValueChange={handleCategoryAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((category) => !selectedCategories.includes(category.id))
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2 mt-2">
              {getSelectedCategoryNames().map((categoryName, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {categoryName}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleCategoryRemove(selectedCategories[index])}
                  />
                </Badge>
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
