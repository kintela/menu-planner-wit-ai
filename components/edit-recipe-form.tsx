"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, Calculator, TestTube } from "lucide-react"
import Image from "next/image"

import { getSupabaseClient } from "@/lib/supabase/client"
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
  const [isLoading, setIsLoading] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<number[]>(selectedCategoryIds)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(recipe.image_url)
  const [imageUrl, setImageUrl] = useState<string>(recipe.image_url || "")
  const [imageTab, setImageTab] = useState<string>(recipe.image_url ? "url" : "upload")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ingredients, setIngredients] = useState<string>(recipe.ingredients || "")
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null)
  const [manualCalories, setManualCalories] = useState<string>(recipe.calories?.toString() || "")
  const [useManualCalories, setUseManualCalories] = useState(!!recipe.calories)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Calcular calorías cuando cambian los ingredientes
  useEffect(() => {
    if (ingredients.trim() && !useManualCalories) {
      const calories = calculateCalories(ingredients)
      setEstimatedCalories(calories)
    } else if (!useManualCalories) {
      setEstimatedCalories(null)
    }
  }, [ingredients, useManualCalories])

  const testDbUpdate = async () => {
    if (!uploadedImageUrl) {
      toast({
        title: "No hay imagen subida",
        description: "Primero sube una imagen para probar la actualización de BD",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/test-db-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: recipe.id,
          imageUrl: uploadedImageUrl,
        }),
      })

      const data = await response.json()
      console.log("Test DB update result:", data)

      if (data.success) {
        toast({
          title: "Test completado",
          description: "Revisa la consola para ver los resultados del test",
        })
      } else {
        toast({
          title: "Test falló",
          description: "Revisa la consola para ver los errores",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing DB update:", error)
      toast({
        title: "Error en test",
        description: "Error al probar la actualización de BD",
        variant: "destructive",
      })
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log("=== IMAGE CHANGE HANDLER ===")
    console.log("File selected:", file.name, file.size, file.type)

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Formato no válido",
        description: "Por favor, selecciona un archivo de imagen (JPEG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (máximo 5MB)
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

    // Crear una URL para la vista previa
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
      console.log("Preview URL created")
    }
    reader.readAsDataURL(file)

    // Subir la imagen inmediatamente
    try {
      setIsImageUploading(true)
      console.log("Starting image upload...")

      toast({
        title: "Subiendo imagen",
        description: "Por favor espera mientras se sube la imagen...",
      })

      const formData = new FormData()
      formData.append("file", file)

      console.log("Making fetch request to upload API...")
      const response = await fetch(`/api/upload-image?recipeId=${recipe.id}`, {
        method: "POST",
        body: formData,
      })

      console.log("Upload response status:", response.status)
      console.log("Upload response ok:", response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Upload response error:", errorText)
        throw new Error(`Error al subir la imagen: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Upload response data:", data)

      if (data.url) {
        setUploadedImageUrl(data.url)
        console.log("✅ Image uploaded successfully, URL:", data.url)

        toast({
          title: "Imagen subida",
          description: "La imagen se ha subido correctamente. Ahora puedes probar guardarla en BD.",
        })
      } else {
        throw new Error("No se recibió URL de la imagen")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast({
        title: "Error al subir la imagen",
        description: `No se pudo subir la imagen: ${error instanceof Error ? error.message : "Error desconocido"}`,
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
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const preparation = formData.get("preparation") as string
    const video_url = (formData.get("video_url") as string) || null
    const source_url = (formData.get("source_url") as string) || null

    // Validación del nombre (único campo obligatorio)
    if (!name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor, introduce un nombre para la receta.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      // Determinar la URL de la imagen
      let finalImageUrl = recipe.image_url // Mantener la imagen actual por defecto

      if (imageTab === "url" && imageUrl.trim()) {
        finalImageUrl = imageUrl.trim()
        console.log("Using URL image:", finalImageUrl)
      } else if (uploadedImageUrl) {
        finalImageUrl = uploadedImageUrl
        console.log("Using previously uploaded image:", finalImageUrl)
      }

      console.log("Final image URL to save:", finalImageUrl)

      // Determinar las calorías finales
      let finalCalories = null

      if (useManualCalories && manualCalories) {
        finalCalories = Number.parseInt(manualCalories)
      } else if (estimatedCalories) {
        finalCalories = estimatedCalories
      }

      const supabase = getSupabaseClient()

      // Actualizar la receta
      const updateData = {
        name,
        ingredients: ingredients || "",
        preparation: preparation || "",
        image_url: finalImageUrl,
        video_url: video_url,
        source_url: source_url,
        calories: finalCalories,
      }

      console.log("Updating recipe with data:", updateData)

      const { data: updateResult, error } = await supabase
        .from("recipes")
        .update(updateData)
        .eq("id", recipe.id)
        .select()

      if (error) {
        console.error("Database update error:", error)
        throw error
      }

      console.log("Recipe updated successfully:", updateResult)

      // Verificar que la receta se actualizó correctamente
      const { data: updatedRecipe, error: fetchError } = await supabase
        .from("recipes")
        .select("id, name, image_url")
        .eq("id", recipe.id)
        .single()

      if (fetchError) {
        console.error("Error fetching updated recipe:", fetchError)
      } else {
        console.log("✅ Recipe after update:", updatedRecipe)
        console.log("✅ Image URL in database:", updatedRecipe.image_url)
      }

      // Actualizar las categorías
      await supabase.from("recipe_categories").delete().eq("recipe_id", recipe.id)

      if (selectedCategories.length > 0) {
        const categoryRelations = selectedCategories.map((categoryId) => ({
          recipe_id: recipe.id,
          category_id: categoryId,
        }))

        const { error: categoryError } = await supabase.from("recipe_categories").insert(categoryRelations)

        if (categoryError) throw categoryError
      }

      toast({
        title: "Receta actualizada",
        description: "La receta se ha actualizado correctamente. Redirigiendo...",
      })

      setTimeout(() => {
        console.log("Ejecutando redirección a /recipes desde edición")
        router.push("/recipes")
        router.refresh()
      }, 1000)
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast({
        title: "Error",
        description: `Ha ocurrido un error al actualizar la receta: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre de la receta *</Label>
          <Input id="name" name="name" defaultValue={recipe.name} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredientes</Label>
          <Textarea
            id="ingredients"
            name="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Escribe los ingredientes, uno por línea (ej: 200g de arroz, 1 pollo, 2 cebollas...)"
            className="min-h-32"
          />
        </div>

        {/* Sección de calorías */}
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
              <p className="text-xs text-muted-foreground">Introduce el número total de calorías para toda la receta</p>
            </div>
          ) : (
            estimatedCalories !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calculator className="h-4 w-4" />
                <span>
                  Calorías estimadas: ~{estimatedCalories} cal (total) / ~{Math.round(estimatedCalories / 4)} cal (por
                  porción)
                </span>
              </div>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="preparation">Preparación</Label>
          <Textarea
            id="preparation"
            name="preparation"
            defaultValue={recipe.preparation}
            placeholder="Describe los pasos para preparar la receta"
            className="min-h-32"
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
                    onError={() => {
                      toast({
                        title: "Error al cargar la imagen",
                        description: "La URL proporcionada no es válida o no es accesible.",
                        variant: "destructive",
                      })
                      setImagePreview(null)
                    }}
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
                    <div className="absolute bottom-2 left-2 space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md">✅ Imagen subida</span>
                      <Button type="button" size="sm" variant="outline" onClick={testDbUpdate} className="text-xs">
                        <TestTube className="h-3 w-3 mr-1" />
                        Test BD
                      </Button>
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
          <p className="text-xs text-muted-foreground">
            Añade un enlace a la página web de donde has obtenido esta receta
          </p>
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
          <p className="text-xs text-muted-foreground">
            Añade un enlace a un video que muestre cómo preparar esta receta (YouTube, Vimeo, etc.)
          </p>
        </div>

        <div className="space-y-2 border p-4 rounded-md">
          <h3 className="text-lg font-medium mb-4">Categorías</h3>
          {categories && categories.length > 0 ? (
            <CategorySelector
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
          ) : (
            <p className="text-muted-foreground">No hay categorías disponibles.</p>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-4">* Los campos marcados con asterisco son obligatorios</div>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={isLoading || isImageUploading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/recipes")}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  )
}
