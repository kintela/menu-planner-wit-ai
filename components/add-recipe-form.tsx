"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X, Calculator } from "lucide-react"
import Image from "next/image"

import { getSupabaseClient } from "@/lib/supabase/client"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategorySelector } from "@/components/category-selector"
import { calculateCalories } from "@/lib/calories-calculator"

interface AddRecipeFormProps {
  categories: Category[]
}

export function AddRecipeForm({ categories }: AddRecipeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [imageTab, setImageTab] = useState<string>("url")
  const [ingredients, setIngredients] = useState<string>("")
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null)
  const [manualCalories, setManualCalories] = useState<string>("")
  const [useManualCalories, setUseManualCalories] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Efecto para limpiar el formulario cuando el componente se monta
  useEffect(() => {
    // Limpiar el formulario
    setSelectedCategories([])
    setImageFile(null)
    setImagePreview(null)
    setImageUrl("")
    setImageTab("url")
    setIngredients("")
    setEstimatedCalories(null)
    setManualCalories("")
    setUseManualCalories(false)

    // Limpiar los campos del formulario de manera segura
    if (formRef.current) {
      formRef.current.reset()
    }
  }, [])

  // Calcular calorías cuando cambian los ingredientes
  useEffect(() => {
    if (ingredients.trim() && !useManualCalories) {
      const calories = calculateCalories(ingredients)
      setEstimatedCalories(calories)
    } else {
      setEstimatedCalories(null)
    }
  }, [ingredients, useManualCalories])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value)
    setImageFile(null)
    setImagePreview(e.target.value)
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
      let finalImageUrl = null

      if (imageTab === "url" && imageUrl) {
        finalImageUrl = imageUrl
      } else if (imageTab === "upload" && imageFile) {
        try {
          // Intentar subir la imagen usando FormData y fetch
          const uploadFormData = new FormData()
          uploadFormData.append("file", imageFile)

          const response = await fetch("/api/upload-image", {
            method: "POST",
            body: uploadFormData,
          })

          if (!response.ok) {
            throw new Error(`Error al subir la imagen: ${response.statusText}`)
          }

          const data = await response.json()
          finalImageUrl = data.url
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError)
          toast({
            title: "Error al subir la imagen",
            description: "No se pudo subir la imagen. La receta se guardará sin imagen.",
            variant: "destructive",
          })
        }
      }

      // Determinar las calorías finales
      let finalCalories = null

      if (useManualCalories && manualCalories) {
        // Si el usuario eligió calorías manuales, usar esas
        finalCalories = Number.parseInt(manualCalories)
      } else if (estimatedCalories) {
        // Si no usa calorías manuales, usar las calculadas
        finalCalories = estimatedCalories
      }

      const supabase = getSupabaseClient()

      // Insertar la receta
      const { data: recipe, error } = await supabase
        .from("recipes")
        .insert({
          name,
          ingredients: ingredients || "",
          preparation: preparation || "",
          image_url: finalImageUrl,
          video_url: video_url,
          source_url: source_url,
          calories: finalCalories,
          is_ai_generated: false,
        })
        .select()
        .single()

      if (error) throw error

      // Insertar las categorías seleccionadas
      if (selectedCategories.length > 0 && recipe) {
        const categoryRelations = selectedCategories.map((categoryId) => ({
          recipe_id: recipe.id,
          category_id: categoryId,
        }))

        const { error: categoryError } = await supabase.from("recipe_categories").insert(categoryRelations)

        if (categoryError) throw categoryError
      }

      // Mostrar toast de éxito
      toast({
        title: "Receta añadida",
        description: "La receta se ha añadido correctamente. Redirigiendo...",
      })

      // Esperar un momento para que el toast se muestre y luego redirigir
      setTimeout(() => {
        console.log("Ejecutando redirección a /recipes")
        router.push("/recipes")
      }, 1000)
    } catch (error) {
      console.error("Error adding recipe:", error)
      toast({
        title: "Error",
        description: `Ha ocurrido un error al añadir la receta: ${error instanceof Error ? error.message : "Error desconocido"}`,
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
          <Input id="name" name="name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ingredients">Ingredientes</Label>
          <Textarea
            id="ingredients"
            name="ingredients"
            placeholder="Escribe los ingredientes, uno por línea (ej: 200g de arroz, 1 pollo, 2 cebollas...)"
            className="min-h-32"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
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
                    />
                  </label>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source_url">URL de la fuente (opcional)</Label>
          <Input id="source_url" name="source_url" type="url" placeholder="https://www.ejemplo.com/receta-original" />
          <p className="text-xs text-muted-foreground">
            Añade un enlace a la página web de donde has obtenido esta receta
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video_url">URL del video (opcional)</Label>
          <Input id="video_url" name="video_url" type="url" placeholder="https://www.youtube.com/watch?v=..." />
          <p className="text-xs text-muted-foreground">
            Añade un enlace a un video que muestre cómo preparar esta receta (YouTube, Vimeo, etc.)
          </p>
        </div>

        <CategorySelector
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
        />

        <div className="text-sm text-muted-foreground mb-4">* Los campos marcados con asterisco son obligatorios</div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Receta"
          )}
        </Button>
      </form>
    </Card>
  )
}

export default AddRecipeForm
