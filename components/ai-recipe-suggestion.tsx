"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

import { getSupabaseClient } from "@/lib/supabase/client"
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
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<GeneratedRecipe[]>([])

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

    try {
      const mealTypeText = mealType === "comida" ? "almuerzo" : "cena"
      const dishOrderText = dishOrder ? (dishOrder === 1 ? "primer plato" : "segundo plato") : ""
      const contextText = dishOrder ? `${dishOrderText} para ${mealTypeText}` : `plato para ${mealTypeText}`

      const prompt = `Genera 3 recetas diferentes para ${contextText} del ${dayName} basadas en: "${searchQuery}".

Para cada receta, proporciona:
1. Nombre del plato
2. Lista de ingredientes (uno por línea, con cantidades específicas)
3. Instrucciones de preparación (paso a paso)
4. Breve descripción del plato

Formato de respuesta (JSON):
{
  "recipes": [
    {
      "name": "Nombre del plato",
      "ingredients": "ingrediente 1\\ningrediente 2\\n...",
      "preparation": "paso 1\\npaso 2\\n...",
      "description": "Breve descripción"
    }
  ]
}

Asegúrate de que las recetas sean:
- Prácticas y realizables en casa
- Con ingredientes comunes y accesibles
- Apropiadas para ${contextText}
- Variadas entre sí`

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt,
        temperature: 0.8,
      })

      // Intentar parsear la respuesta JSON
      let parsedResponse
      try {
        // Limpiar la respuesta para extraer solo el JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No se encontró JSON válido en la respuesta")
        }
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError)
        throw new Error("Error al procesar la respuesta de la IA")
      }

      if (parsedResponse?.recipes && Array.isArray(parsedResponse.recipes)) {
        setSuggestions(parsedResponse.recipes.slice(0, 3)) // Asegurar máximo 3 recetas
      } else {
        throw new Error("Formato de respuesta inválido")
      }
    } catch (error) {
      console.error("Error generating suggestions:", error)
      toast({
        title: "Error al generar sugerencias",
        description: "No se pudieron generar sugerencias. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const saveRecipe = async (suggestion: GeneratedRecipe) => {
    setIsSaving(true)

    try {
      const supabase = getSupabaseClient()

      // Calcular calorías automáticamente
      const calories = calculateCalories(suggestion.ingredients)

      // Guardar la receta en la base de datos
      const { data: newRecipe, error } = await supabase
        .from("recipes")
        .insert({
          name: suggestion.name,
          ingredients: suggestion.ingredients,
          preparation: suggestion.preparation,
          calories: calories > 0 ? calories : null,
          is_ai_generated: true,
          image_url: null,
          video_url: null,
          source_url: null,
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Receta creada",
        description: `"${suggestion.name}" se ha añadido a tu colección y seleccionado para el menú.`,
      })

      // Llamar al callback con la nueva receta
      onRecipeCreated(newRecipe as Recipe)

      // Cerrar el modal
      setIsOpen(false)
      setSearchQuery("")
      setSuggestions([])
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="px-3" title="Sugerir receta con IA">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Sugerencias de IA
          </DialogTitle>
          <DialogDescription>
            Describe qué tipo de plato buscas para {mealType === "comida" ? "la comida" : "la cena"} del {dayName}
            {dishOrder && ` (${dishOrder === 1 ? "primer" : "segundo"} plato)`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-query">¿Qué tipo de plato buscas?</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                placeholder="ej: pasta italiana, pollo al horno, ensalada fresca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) {
                    generateSuggestions()
                  }
                }}
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

          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Sugerencias generadas:</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{suggestion.name}</CardTitle>
                      <CardDescription>{suggestion.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-1">Ingredientes principales:</h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.ingredients.split("\n").slice(0, 3).join(", ")}
                          {suggestion.ingredients.split("\n").length > 3 && "..."}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">Preparación:</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {suggestion.preparation.split("\n")[0]}...
                        </p>
                      </div>
                      <Button onClick={() => saveRecipe(suggestion)} disabled={isSaving} className="w-full" size="sm">
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          "Seleccionar esta receta"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
              <p className="text-muted-foreground">Generando sugerencias personalizadas...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
