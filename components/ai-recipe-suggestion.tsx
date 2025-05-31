"use client"

import { useState } from "react"
import { Sparkles, Loader2, Plus, Check, ImageOff } from "lucide-react"
import { ImageIcon } from "lucide-react"

import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import type { Recipe } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { calculateCalories } from "@/lib/calories-calculator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AiRecipeSuggestionProps {
  onRecipeCreated: (recipe: Recipe) => void
  mealType: "comida" | "cena"
  dishOrder?: number
  dayName: string
}

interface GeneratedRecipe {
  name: string
  ingredients: string
  preparation: string
  description: string
}

export function AiRecipeSuggestion({ onRecipeCreated, mealType, dishOrder, dayName }: AiRecipeSuggestionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<GeneratedRecipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<Set<number>>(new Set())
  const [enableImageGeneration, setEnableImageGeneration] = useState(false) // Disabled by default

  const generateSuggestions = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Búsqueda requerida",
        description: "Por favor, describe qué tipo de plato buscas.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setSuggestions([])
    setSavedRecipes(new Set()) // Reset saved recipes when generating new ones

    try {
      const response = await fetch("/api/generate-recipe-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery,
          mealType,
          dishOrder,
          dayName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al generar sugerencias")
      }

      if (data.recipes && Array.isArray(data.recipes)) {
        setSuggestions(data.recipes)
      } else {
        throw new Error("Formato de respuesta inválido")
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
      toast({
        title: "Error al generar sugerencias",
        description: error instanceof Error ? error.message : "No se pudieron generar sugerencias. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateRecipeImage = async (recipeName: string, ingredients: string) => {
    // Skip image generation if disabled
    if (!enableImageGeneration) {
      console.log("Image generation disabled, skipping...")
      return null
    }

    try {
      console.log("Attempting to generate image for:", recipeName)

      const response = await fetch("/api/generate-recipe-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeName,
          ingredients,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.warn("Image generation failed:", data.error, data.suggestion)
        return null // Fail silently, recipe creation continues
      }

      console.log("Image generated successfully:", data.imageUrl)
      return data.imageUrl
    } catch (error) {
      console.warn("Image generation error (non-critical):", error)
      return null // Always return null on error, don't throw
    }
  }

  const saveRecipeToCollection = async (suggestion: GeneratedRecipe, index: number) => {
    if (!user) {
      toast({
        title: "Error de autenticación",
        description: "Debes estar autenticado para guardar recetas.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const supabase = getSupabaseClient()

      // Calcular calorías automáticamente
      const calories = calculateCalories(suggestion.ingredients)

      // Intentar generar imagen solo si está habilitado
      let imageUrl = null
      if (enableImageGeneration) {
        try {
          imageUrl = await generateRecipeImage(suggestion.name, suggestion.ingredients)
        } catch (error) {
          console.warn("Image generation failed, continuing without image:", error)
        }
      }

      // Guardar la receta en la base de datos
      const { data: newRecipe, error } = await supabase
        .from("recipes")
        .insert({
          name: suggestion.name,
          ingredients: suggestion.ingredients,
          preparation: suggestion.preparation,
          calories: calories > 0 ? calories : null,
          is_ai_generated: true,
          image_url: imageUrl,
          video_url: null,
          source_url: null,
          user_id: user.id, // Añadir el user_id
        })
        .select()
        .single()

      if (error) throw error

      // Marcar como guardada
      setSavedRecipes((prev) => new Set(prev).add(index))

      toast({
        title: "¡Receta guardada!",
        description: `"${suggestion.name}" se ha añadido a tu colección de recetas${imageUrl ? " con imagen generada" : ""}.`,
      })
    } catch (error) {
      console.error("Error saving recipe:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la receta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const saveAndSelectRecipe = async (suggestion: GeneratedRecipe) => {
    if (!user) {
      toast({
        title: "Error de autenticación",
        description: "Debes estar autenticado para crear recetas.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const supabase = getSupabaseClient()

      // Calcular calorías automáticamente
      const calories = calculateCalories(suggestion.ingredients)

      // Mostrar mensaje inicial
      toast({
        title: "Creando receta...",
        description: "Guardando la receta en tu colección...",
      })

      // Intentar generar imagen solo si está habilitado
      let imageUrl = null
      if (enableImageGeneration) {
        try {
          imageUrl = await generateRecipeImage(suggestion.name, suggestion.ingredients)
        } catch (error) {
          console.warn("Image generation failed, continuing without image:", error)
        }
      }

      // Guardar la receta en la base de datos (con o sin imagen)
      const { data: newRecipe, error } = await supabase
        .from("recipes")
        .insert({
          name: suggestion.name,
          ingredients: suggestion.ingredients,
          preparation: suggestion.preparation,
          calories: calories > 0 ? calories : null,
          is_ai_generated: true,
          image_url: imageUrl, // Puede ser null si falló la generación o está deshabilitada
          video_url: null,
          source_url: null,
          user_id: user.id, // Añadir el user_id
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "¡Receta creada y seleccionada!",
        description: `"${suggestion.name}" se ha añadido a tu colección y seleccionado para el menú${imageUrl ? " con imagen generada" : ""}.`,
      })

      // Llamar al callback con la nueva receta
      onRecipeCreated(newRecipe as Recipe)

      // Cerrar el modal y limpiar
      setIsOpen(false)
      setSearchQuery("")
      setSuggestions([])
      setSavedRecipes(new Set())
    } catch (error) {
      console.error("Error saving recipe:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la receta. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // No mostrar el componente si no hay usuario autenticado
  if (!user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="px-3" title="Sugerir receta con IA">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Sugerencias de IA para {dayName}
          </DialogTitle>
          <DialogDescription>
            Describe qué tipo de plato buscas para {mealType === "comida" ? "la comida" : "la cena"}
            {dishOrder && ` (${dishOrder === 1 ? "primer" : "segundo"} plato)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image generation toggle */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <input
              type="checkbox"
              id="enable-images"
              checked={enableImageGeneration}
              onChange={(e) => setEnableImageGeneration(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="enable-images" className="text-sm flex items-center gap-2">
              {enableImageGeneration ? (
                <ImageIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ImageOff className="h-4 w-4 text-gray-400" />
              )}
              Generar imágenes con IA (experimental)
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-query">¿Qué tipo de plato buscas?</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                placeholder="ej: pasta italiana, pollo al horno, ensalada fresca, sopa de verduras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating && searchQuery.trim()) {
                    generateSuggestions()
                  }
                }}
                className="flex-1"
              />
              <Button onClick={generateSuggestions} disabled={isGenerating || !searchQuery.trim()}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Generar"
                )}
              </Button>
            </div>
          </div>

          {isGenerating && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
              <p className="text-muted-foreground">Generando 3 sugerencias personalizadas...</p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Elige una opción o guarda las que te gusten:</h3>
              <div className="grid gap-4">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow border-2 hover:border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        {suggestion.name}
                      </CardTitle>
                      <CardDescription className="text-sm">{suggestion.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-green-700">🥘 Ingredientes principales:</h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.ingredients.split("\n").slice(0, 4).join(" • ")}
                          {suggestion.ingredients.split("\n").length > 4 && " • ..."}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-blue-700">👨‍🍳 Preparación:</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {suggestion.preparation.split("\n")[0]}...
                        </p>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => saveAndSelectRecipe(suggestion)}
                          disabled={isSaving}
                          className="flex-1"
                          size="sm"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creando receta...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Seleccionar para el menú
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => saveRecipeToCollection(suggestion, index)}
                          disabled={isSaving || savedRecipes.has(index)}
                          variant="outline"
                          size="sm"
                          className="px-4"
                        >
                          {savedRecipes.has(index) ? (
                            <>
                              <Check className="mr-2 h-4 w-4 text-green-600" />
                              Guardada
                            </>
                          ) : isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Guardar receta
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
