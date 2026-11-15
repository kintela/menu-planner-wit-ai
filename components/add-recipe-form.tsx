"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Loader2, Upload, X, Calculator } from "lucide-react"
import Image from "next/image"

import { useAuth } from "@/components/auth/auth-provider"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CategorySelector } from "@/components/category-selector"
import { calculateCalories } from "@/lib/calories-calculator"
import { buildJsonRequest, imageResultMessage } from "@/lib/recipes/recipe-ui"

interface AddRecipeFormProps {
  categories: Category[]
}

export function AddRecipeForm({ categories }: AddRecipeFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<string>("")
  const [estimatedCalories, setEstimatedCalories] = useState<number | null>(null)
  const [manualCalories, setManualCalories] = useState<string>("")
  const [useManualCalories, setUseManualCalories] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Efecto para limpiar el formulario cuando el componente se monta
  useEffect(() => {
    setSelectedCategories([])
    setImageFile(null)
    setImagePreview(null)
    setIngredients("")
    setEstimatedCalories(null)
    setManualCalories("")
    setUseManualCalories(false)

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
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isLoading) return // Prevent double submission

    setIsLoading(true)

    try {
      // Verificar que el usuario esté autenticado
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar autenticado para añadir una receta.",
          variant: "destructive",
        })
        return
      }

      const formData = new FormData(e.currentTarget)
      const name = formData.get("name") as string
      const preparation = formData.get("preparation") as string
      const video_url = (formData.get("video_url") as string) || null
      const source_url = (formData.get("source_url") as string) || null

      // Validación del nombre
      if (!name?.trim()) {
        toast({
          title: "Nombre requerido",
          description: "Por favor, introduce un nombre para la receta.",
          variant: "destructive",
        })
        return
      }

      // Determinar las calorías finales
      let finalCalories = null
      if (useManualCalories && manualCalories) {
        finalCalories = Number.parseInt(manualCalories)
      } else if (estimatedCalories) {
        finalCalories = estimatedCalories
      }

      // Preparar datos para insertar
      const recipeData = {
        name: name.trim(),
        ingredients: ingredients.trim() || "",
        preparation: preparation?.trim() || "",
        video_url: video_url,
        source_url: source_url,
        calories: finalCalories,
        is_ai_generated: false,
      }

      const resp = await fetch('/api/recipes', {
        ...buildJsonRequest('POST', {
          ...recipeData,
          categories: selectedCategories,
        }),
      })
      let apiJson: { success?: boolean; recipe_id?: number; error?: string } | null = null
      try { apiJson = await resp.json() } catch { throw new Error('Respuesta inválida del servidor') }
      if (!resp.ok || !apiJson?.success || !apiJson.recipe_id) {
        throw new Error(apiJson?.error || 'Error creando la receta (API)')
      }

      let imageNotice: string | null = null
      let imagePartial = false
      if (imageFile) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append("image", imageFile)
          const imageResponse = await fetch(`/api/recipes/${apiJson.recipe_id}/image`, { method: "POST", body: uploadFormData })
          const imagePayload = await imageResponse.json().catch(() => ({ image: { state: "failed" } }))
          imageNotice = imageResultMessage(imagePayload.image)
          imagePartial = !imageResponse.ok || imagePayload.image?.state !== "complete"
        } catch {
          imageNotice = "La receta se creó, pero no se pudo completar la carga de la imagen. La receta permanece guardada."
          imagePartial = true
        }
      }

      toast({
        title: imagePartial ? "Receta creada con aviso" : "¡Éxito!",
        description: imageNotice ? `La receta se ha creado. ${imageNotice}` : "La receta se ha añadido correctamente.",
        variant: imagePartial ? "destructive" : undefined,
      })
      setTimeout(() => { window.location.href = `/recipes/${apiJson.recipe_id}` }, 1200)
    } catch (error) {
      let errorMessage = "Error desconocido"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Si no hay usuario, mostrar mensaje
  if (!user) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Debes estar autenticado para añadir una receta.</p>
        </div>
      </Card>
    )
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
          {imagePreview ? (
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

        <div className="text-sm text-muted-foreground mb-4">* Solo el nombre es obligatorio</div>

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
