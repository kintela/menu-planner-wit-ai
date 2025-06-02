"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Upload, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Recipe {
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  servings: number
  difficulty: "easy" | "medium" | "hard"
  category: string
  tags: string[]
  image_url?: string
  video_url?: string
  source_url?: string
  calories_per_serving?: number
}

export default function AddRecipeForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [recipe, setRecipe] = useState<Recipe>({
    title: "",
    description: "",
    ingredients: [""],
    instructions: [""],
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    difficulty: "easy",
    category: "",
    tags: [],
    calories_per_serving: undefined,
  })

  const [newTag, setNewTag] = useState("")

  const handleInputChange = (field: keyof Recipe, value: any) => {
    setRecipe((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: "ingredients" | "instructions", index: number, value: string) => {
    setRecipe((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }))
  }

  const addArrayItem = (field: "ingredients" | "instructions") => {
    setRecipe((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }))
  }

  const removeArrayItem = (field: "ingredients" | "instructions", index: number) => {
    setRecipe((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !recipe.tags.includes(newTag.trim())) {
      setRecipe((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setRecipe((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedFile) return null

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch("/api/upload-image?recipeId=new", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al subir la imagen")
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Verificar autenticación
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        alert("Debes estar autenticado para crear una receta")
        return
      }

      // Subir imagen si hay una seleccionada
      let imageUrl = null
      if (selectedFile) {
        imageUrl = await uploadImage()
        if (!imageUrl) {
          alert("Error al subir la imagen")
          return
        }
      }

      // Filtrar ingredientes e instrucciones vacías
      const filteredIngredients = recipe.ingredients.filter((ing) => ing.trim() !== "")
      const filteredInstructions = recipe.instructions.filter((inst) => inst.trim() !== "")

      // Preparar datos para insertar
      const recipeData = {
        title: recipe.title,
        description: recipe.description,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        category: recipe.category || null,
        tags: recipe.tags,
        image_url: imageUrl,
        video_url: recipe.video_url || null,
        source_url: recipe.source_url || null,
        calories_per_serving: recipe.calories_per_serving || null,
        created_by: user.id,
      }

      const { data, error } = await supabase.from("recipes").insert([recipeData]).select().single()

      if (error) {
        console.error("Error creating recipe:", error)
        alert("Error al crear la receta")
        return
      }

      alert("¡Receta creada exitosamente!")
      router.push(`/recipes/${data.id}`)
    } catch (error) {
      console.error("Error:", error)
      alert("Error inesperado al crear la receta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Añadir Nueva Receta</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={recipe.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={recipe.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Ej: Desayuno, Almuerzo, Cena"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={recipe.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={3}
            />
          </div>

          {/* Imagen */}
          <div className="space-y-2">
            <Label>Imagen de la receta</Label>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Subiendo..." : "Seleccionar imagen"}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </div>
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}
          </div>

          {/* Tiempos y porciones */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prep_time">Tiempo de preparación (min)</Label>
              <Input
                id="prep_time"
                type="number"
                value={recipe.prep_time}
                onChange={(e) => handleInputChange("prep_time", Number.parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cook_time">Tiempo de cocción (min)</Label>
              <Input
                id="cook_time"
                type="number"
                value={recipe.cook_time}
                onChange={(e) => handleInputChange("cook_time", Number.parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Porciones</Label>
              <Input
                id="servings"
                type="number"
                value={recipe.servings}
                onChange={(e) => handleInputChange("servings", Number.parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Dificultad</Label>
              <select
                id="difficulty"
                value={recipe.difficulty}
                onChange={(e) => handleInputChange("difficulty", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="easy">Fácil</option>
                <option value="medium">Medio</option>
                <option value="hard">Difícil</option>
              </select>
            </div>
          </div>

          {/* Calorías */}
          <div className="space-y-2">
            <Label htmlFor="calories">Calorías por porción (opcional)</Label>
            <Input
              id="calories"
              type="number"
              value={recipe.calories_per_serving || ""}
              onChange={(e) =>
                handleInputChange("calories_per_serving", e.target.value ? Number.parseInt(e.target.value) : undefined)
              }
              min="0"
              placeholder="Ej: 350"
            />
          </div>

          {/* Ingredientes */}
          <div className="space-y-2">
            <Label>Ingredientes *</Label>
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={ingredient}
                  onChange={(e) => handleArrayChange("ingredients", index, e.target.value)}
                  placeholder={`Ingrediente ${index + 1}`}
                  required={index === 0}
                />
                {recipe.ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem("ingredients", index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addArrayItem("ingredients")}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir ingrediente
            </Button>
          </div>

          {/* Instrucciones */}
          <div className="space-y-2">
            <Label>Instrucciones *</Label>
            {recipe.instructions.map((instruction, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="flex-1">
                  <Textarea
                    value={instruction}
                    onChange={(e) => handleArrayChange("instructions", index, e.target.value)}
                    placeholder={`Paso ${index + 1}`}
                    rows={2}
                    required={index === 0}
                  />
                </div>
                {recipe.instructions.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeArrayItem("instructions", index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addArrayItem("instructions")}>
              <Plus className="w-4 h-4 mr-2" />
              Añadir paso
            </Button>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Añadir etiqueta"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* URLs opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video_url">URL del vídeo (opcional)</Label>
              <Input
                id="video_url"
                value={recipe.video_url || ""}
                onChange={(e) => handleInputChange("video_url", e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_url">URL de la fuente (opcional)</Label>
              <Input
                id="source_url"
                value={recipe.source_url || ""}
                onChange={(e) => handleInputChange("source_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Botón de envío */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Receta"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
