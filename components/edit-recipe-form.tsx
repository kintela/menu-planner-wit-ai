"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, Calculator } from "lucide-react"
import Image from "next/image"

import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import type { Category, Recipe } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategorySelector } from "@/components/category-selector"
import { calculateCalories } from "@/lib/calories-calculator"

interface EditRecipeFormProps {
  recipe: Recipe
  categories: Category[]
  selectedCategoryIds: number[]
}

export function EditRecipeForm({ recipe, categories, selectedCategoryIds }: EditRecipeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<number[]>(selectedCategoryIds)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(recipe.image_url || null)
  const [imageUrl, setImageUrl] = useState<string>(recipe.image_url || "")
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [imageTab, setImageTab] = useState<string>("url")
  const [ingredients, setIngredients] = useState<string>("")
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null)
  const [manualCalories, setManualCalories] = useState<string>("")
  const [useManualCalories, setUseManualCalories] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const supabase = getSupabaseClient()

  // Inicializar el formulario con los datos de la receta
  useEffect(() => {
    let ingredientsText = ""
    if (Array.isArray(recipe.ingredients)) {
      ingredientsText = recipe.ingredients.join("\n")
    } else if (typeof recipe.ingredients === "string") {
      ingredientsText = recipe.ingredients
    }
    setIngredients(ingredientsText)

    if (recipe.calories) {
      setManualCalories(recipe.calories.toString())
      setUseManualCalories(true)
    }

    if (recipe.image_url) {
      setImageUrl(recipe.image_url)
      setImagePreview(recipe.image_url)
    }
  }, [recipe])

  // Calcular calorías cuando cambian los ingredientes
  useEffect(() => {
    if (ingredients.trim() && !useManualCalories) {
      const calories = calculateCalories(ingredients)
      setEstimatedCalories(calories)
    } else {
      setEstimatedCalories(null)
    }
  }, [ingredients, useManualCalories])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato no válido",
        description: "Por favor, selecciona un archivo de imagen (JPEG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)
    setImageUrl("")

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setIsImageUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/upload-image?recipeId=${recipe.id}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Error al subir la imagen: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.url) {
        setUploadedImageUrl(data.url)
        setImageUrl(data.url)
        toast({
          title: "Imagen guardada",
          description: "La imagen se ha subido correctamente.",
        })
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error al subir la imagen",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      })
    } finally {
      setIsImageUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl("")
    setUploadedImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setImageFile(null)
    setImagePreview(e.target.value)
    setUploadedImageUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isLoading) return
    setIsLoading(true)

    try {
      // Verificar autenticación
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para editar recetas.",
          variant: "destructive",
        })
        return
      }

      // Obtener el token de sesión
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          variant: "destructive",
        })
        return
      }

      const formData = new FormData(e.currentTarget)
      const name = formData.get("name") as string

      if (!name?.trim()) {
        toast({
          title: "Nombre requerido",
          description: "Por favor, introduce un nombre para la receta.",
          variant: "destructive",
        })
        return
      }

      // Preparar datos básicos
      const updateData = {
        name: name.trim(),
        ingredients: ingredients.trim(),
        preparation: (formData.get("preparation") as string)?.trim() || "",
        image_url: uploadedImageUrl || imageUrl || recipe.image_url,
        video_url: (formData.get("video_url") as string)?.trim() || null,
        source_url: (formData.get("source_url") as string)?.trim() || null,
        calories: useManualCalories && manualCalories ? Number.parseInt(manualCalories) : estimatedCalories,
        categories: selectedCategories,
      }

      console.log("Enviando datos:", updateData)

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
        if (response.status === 401) {
          toast({
            title: "No autorizado",
            description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            variant: "destructive",
          })
          return
        }
        if (response.status === 403) {
          toast({
            title: "Sin permisos",
            description: "Solo puedes editar tus propias recetas.",
            variant: "destructive",
          })
          return
        }
        throw new Error(errorData.error || `Error ${response.status}`)
      }

      const result = await response.json()
      console.log("Resultado:", result)

      toast({
        title: "¡Receta actualizada!",
        description: "La receta se ha actualizado correctamente.",
      })

      // Redirigir después de un breve delay
      setTimeout(() => {
        window.location.href = `/recipes/${recipe.id}`
      }, 500)
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la receta *</Label>
          <Input id="name" name="name" required defaultValue={recipe.name || ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredientes</Label>
          <Textarea
            id="ingredients"
            name="ingredients"
            placeholder="Escribe los ingredientes, uno por línea"
            className="min-h-32"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
        </div>

        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="use-manual-calories"
              checked={useManualCalories}
              onChange={(e) => setUseManualCalories(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="use-manual-calories" className="cursor-pointer">
              Introducir calorías manualmente
            </Label>
          </div>

          {useManualCalories ? (
            <div className="space-y-2">
              <Label htmlFor="manual-calories">Calorías totales</Label>
              <Input
                id="manual-calories"
                type="number"
                min="0"
                max="5000"
                placeholder="ej: 450"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
              />
            </div>
          ) : (
            estimatedCalories !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calculator className="h-4 w-4" />
                <span>Calorías estimadas: ~{estimatedCalories} cal</span>
              </div>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preparation">Preparación</Label>
          <Textarea
            id="preparation"
            name="preparation"
            placeholder="Describe los pasos para preparar la receta"
            className="min-h-32"
            defaultValue={
              Array.isArray(recipe.preparation)
                ? recipe.preparation.join("\n")
                : typeof recipe.preparation === "string"
                  ? recipe.preparation
                  : ""
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Imagen del plato</Label>
          <Tabs value={imageTab} onValueChange={setImageTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">URL de imagen</TabsTrigger>
              <TabsTrigger value="upload">Subir imagen</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image_url">URL de la imagen</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={imageUrl}
                  onChange={handleUrlChange}
                />
              </div>
              {imageUrl && (
                <div className="relative w-full aspect-video">
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt="Vista previa"
                    fill
                    className="object-cover rounded-md"
                    onError={() => setImagePreview(null)}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="upload">
              {imagePreview && imageTab === "upload" ? (
                <div className="relative w-full aspect-video mb-4">
                  <Image
                    src={imagePreview || "/placeholder.svg"}
                    alt="Vista previa"
                    fill
                    className="object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {uploadedImageUrl && (
                    <div className="absolute bottom-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">
                      ✅ Imagen guardada
                    </div>
                  )}
                  {isImageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="bg-white p-4 rounded-md flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Subiendo imagen...</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image"
                    className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG o GIF (máx. 5MB)</p>
                    </div>
                    <input
                      id="image"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={isImageUploading}
                    />
                  </label>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source_url">URL de la fuente (opcional)</Label>
          <Input
            id="source_url"
            name="source_url"
            type="url"
            placeholder="https://www.ejemplo.com/receta-original"
            defaultValue={recipe.source_url || ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="video_url">URL del video (opcional)</Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            defaultValue={recipe.video_url || ""}
          />
        </div>

        <CategorySelector
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
        />

        <div className="text-sm text-muted-foreground mb-4">* Los campos marcados con asterisco son obligatorios</div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando cambios...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
