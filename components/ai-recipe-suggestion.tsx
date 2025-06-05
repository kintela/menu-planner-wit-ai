"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"

import { Sparkles, Loader2, Plus, Check } from "lucide-react"

import { getSupabaseClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth/auth-provider"
import type { Recipe } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { calculateCalories } from "@/lib/calories-calculator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  const [dailyUsage, setDailyUsage] = useState<number>(0)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [usageLimitReached, setUsageLimitReached] = useState<boolean>(false)

  const checkUserLimits = async () => {
    if (!user) return

    try {
      const supabase = getSupabaseClient()

      // Verificar si es administrador
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

      const userIsAdmin = profile?.role === "admin"
      setIsAdmin(userIsAdmin)

      // Verificar uso diario para todos los usuarios (admin y no admin)
      const { data: usageData } = await supabase.rpc("get_daily_ai_usage", { p_user_id: user.id })

      const currentUsage = usageData || 0
      setDailyUsage(currentUsage)

      // Solo establecer el límite para usuarios no admin
      if (!userIsAdmin) {
        setUsageLimitReached(currentUsage >= 2)
      } else {
        setUsageLimitReached(false) // Los admin nunca alcanzan el límite
      }
    } catch (error) {
      console.error("Error checking user limits:", error)
    }
  }

  const generateSuggestions = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Búsqueda requerida",
        description: "Por favor, describe qué tipo de plato buscas.",
        variant: "destructive",
      })
      return
    }

    // Verificar límites para usuarios no admin
    if (!isAdmin && usageLimitReached) {
      toast({
        title: "Límite diario alcanzado",
        description: "Has usado el generador de IA 2 veces hoy. Podrás usarlo nuevamente mañana.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setSuggestions([])
    setSavedRecipes(new Set())

    try {
      // Incrementar contador de uso para TODOS los usuarios (admin y no admin)
      const supabase = getSupabaseClient()
      const { data: newUsage } = await supabase.rpc("increment_ai_usage", { p_user_id: user?.id })

      // Actualizar el contador de uso mostrado
      setDailyUsage(newUsage || 0)

      // Verificar si alcanzó el límite después de este uso (solo para no admin)
      if (!isAdmin && newUsage >= 2) {
        setUsageLimitReached(true)
      }

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

      // Check if response is ok first
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Error ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, get text instead
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch {
            // Fallback to status message
          }
        }
        throw new Error(errorMessage)
      }

      // Try to parse JSON response
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError)
        // Try to get the actual response text for debugging
        try {
          const responseText = await response.text()
          console.error("Response text:", responseText)
          throw new Error(`El servidor devolvió una respuesta inválida. Por favor, inténtalo de nuevo.`)
        } catch {
          throw new Error(`Error al procesar la respuesta del servidor. Por favor, inténtalo de nuevo.`)
        }
      }

      if (data.recipes && Array.isArray(data.recipes)) {
        setSuggestions(data.recipes)

        // Mostrar mensaje de límite si es necesario (solo para no admin)
        if (!isAdmin && dailyUsage + 1 >= 2) {
          toast({
            title: "Último uso del día",
            description: "Has alcanzado el límite diario de 2 generaciones. Podrás usarlo nuevamente mañana.",
            variant: "default",
          })
        }
      } else {
        throw new Error("Formato de respuesta inválido del servidor")
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
    // Image generation is disabled
    console.log("Image generation disabled, skipping...")
    return null
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

      // Imagen deshabilitada
      const imageUrl = null

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

      // Imagen deshabilitada
      const imageUrl = null

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

  useEffect(() => {
    if (isOpen && user) {
      checkUserLimits()
    }
  }, [isOpen, user])

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
            <br />
            {!isAdmin && (
              <span className="text-xs text-muted-foreground mt-1 block">
                💡 Límite: 2 generaciones por día ({dailyUsage}/2 usadas hoy)
                {usageLimitReached && " - Límite alcanzado hasta mañana"}
              </span>
            )}
            {isAdmin && (
              <span className="text-xs text-green-600 mt-1 block">
                👑 Administrador: Generaciones ilimitadas (Uso actual: {dailyUsage})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <Button
                onClick={generateSuggestions}
                disabled={isGenerating || !searchQuery.trim() || (!isAdmin && usageLimitReached)}
                className={!isAdmin && usageLimitReached ? "opacity-50" : ""}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : !isAdmin && usageLimitReached ? (
                  "Límite diario alcanzado"
                ) : (
                  <>
                    Generar
                    {!isAdmin && <span className="ml-2 text-xs opacity-75">({dailyUsage}/2 usos hoy)</span>}
                  </>
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
                        <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                          <ul className="list-disc list-inside space-y-1">
                            {suggestion.ingredients
                              .split("\n")
                              .filter((ingredient) => ingredient.trim())
                              .map((ingredient, idx) => (
                                <li key={idx} className="text-sm">
                                  {ingredient.trim()}
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-blue-700">👨‍🍳 Preparación:</h4>
                        <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                          <div className="space-y-2">
                            {suggestion.preparation
                              .split("\n")
                              .filter((step) => step.trim())
                              .map((step, idx) => (
                                <p key={idx} className="text-sm leading-relaxed">
                                  <span className="font-medium text-blue-600">{idx + 1}.</span> {step.trim()}
                                </p>
                              ))}
                          </div>
                        </div>
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
