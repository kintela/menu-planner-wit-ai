"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import { buildJsonRequest, imageResultActiveUrl, imageResultMessage } from "@/lib/recipes/recipe-ui"
import type { PublicRecipe } from "@/lib/recipes/recipe-domain"

interface Category {
  id: string
  name: string
}

interface EditRecipeFormProps {
  recipe: PublicRecipe
  categories: Category[]
  selectedCategoryIds?: number[]
}

export function EditRecipeForm({ recipe, categories, selectedCategoryIds = recipe.categories.map((category) => category.id) }: EditRecipeFormProps) {
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

  const [selectedCategories, setSelectedCategories] = useState<string[]>(selectedCategoryIds.map(String))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setSelectedCategories(selectedCategoryIds.map(String)), [selectedCategoryIds])

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
      const uploadFormData = new FormData()
      uploadFormData.append("image", file)

      const response = await fetch(`/api/recipes/${recipe.id}/image`, {
        method: "POST",
        body: uploadFormData,
      })

      const data = await response.json()
      const message = imageResultMessage(data?.image)
      const activeUrl = imageResultActiveUrl(data?.image)
      if (typeof activeUrl === "string") setFormData((prev) => ({ ...prev, image_url: activeUrl }))
      toast({
        title: data?.image?.state === "complete" ? "Imagen actualizada" : "Estado de la imagen",
        description: message,
        variant: data?.image?.state === "complete" ? undefined : "destructive",
      })
    } catch {
      toast({ title: "Error al actualizar imagen", description: "No se pudo contactar con el servidor. La imagen anterior se conserva.", variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = async () => {
    setUploadingImage(true)
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/image`, buildJsonRequest("DELETE"))
      const data = await response.json().catch(() => ({ image: { state: "failed" } }))
      if (data?.image?.url === null || data?.image?.state === "complete" || data?.image?.state === "partial") {
        setFormData((prev) => ({ ...prev, image_url: "" }))
      }
      toast({
        title: data?.image?.state === "complete" ? "Imagen retirada" : "Estado de la imagen",
        description: imageResultMessage(data?.image),
        variant: data?.image?.state === "complete" ? undefined : "destructive",
      })
    } catch {
      toast({ title: "Error al retirar imagen", description: "No se pudo contactar con el servidor; no se afirma ningún cambio.", variant: "destructive" })
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

    setIsSubmitting(true)

    try {
      const updateData = {
        name: formData.name,
        ingredients: formData.ingredients,
        preparation: formData.preparation,
        calories: formData.calories ? Number(formData.calories) : null,
        source_url: formData.source_url || null,
        video_url: formData.video_url || null,
        categories: selectedCategories.map((id) => Number.parseInt(id)),
      }

      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        ...buildJsonRequest("PUT", updateData),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      let responseData
      try {
        const responseText = await response.text()
        responseData = JSON.parse(responseText)
      } catch {
        throw new Error("Invalid response from server")
      }

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update recipe")
      }

      if (responseData.success) {
        toast({
          title: "¡Éxito!",
          description: "Receta actualizada correctamente",
        })

        window.location.href = `/recipes/${recipe.id}`
      } else {
        throw new Error("Update failed")
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
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
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingImage ? "Subiendo..." : "Seleccionar imagen"}
              </Button>
              <input
                ref={fileInputRef}
                id="image_file"
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={uploadingImage}
              />
              {imageFile?.name && <span className="text-sm text-muted-foreground">{imageFile.name}</span>}
            </div>
            {uploadingImage && <span className="text-xs text-blue-600">Subiendo imagen...</span>}
              {formData.image_url && (
                <div className="mt-2">
                  <img src={formData.image_url} alt="Imagen de la receta" className="max-h-40 rounded" />
                  <Button type="button" variant="destructive" size="sm" className="mt-2" onClick={handleRemoveImage} disabled={uploadingImage}>
                    Retirar imagen
                  </Button>
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
