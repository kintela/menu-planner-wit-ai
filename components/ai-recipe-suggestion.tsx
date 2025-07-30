"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import { Sparkles, Loader2, Plus, Check, AlertCircle, RefreshCw } from "lucide-react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [lastError, setLastError] = useState<string>("")
  const [retryCount, setRetryCount] = useState(0)

  const checkUserLimits = async () => {
    if (!user) return

    try {
      const supabase = getSupabaseClient()

      // Verificar si es administrador
      const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

      const userIsAdmin = profile?.role === "admin"
      setIsAdmin(userIsAdmin)

      // Verificar uso diario
      const { data: usageData } = await supabase.rpc("get_daily_ai_usage", { p_user_id: user.id })

      const currentUsage = usageData || 0
      setDailyUsage(currentUsage)

      if (!userIsAdmin) {
        setUsageLimitReached(currentUsage >= 2)
      } else {
        setUsageLimitReached(false)
      }
    } catch (error) {
      console.error("Error checking user limits:", error)
    }
  }

  const generateSuggestions = async (isRetry = false) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Búsqueda requerida",
        description: "Por favor, describe qué tipo de plato buscas.",
        variant: "destructive",
      })
      return
    }

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
    setLastError("")

    if (!isRetry) {
      setRetryCount(0)
    }

    const startTime = Date.now()
    try {
      // Incrementar contador de uso solo si no es retry
      const supabase = getSupabaseClient()
      let newUsage = dailyUsage

      if (!isRetry) {
        try {
          const { data: usageResult } = await supabase.rpc("increment_ai_usage", { p_user_id: user?.id })
          newUsage = usageResult || dailyUsage + 1
          setDailyUsage(newUsage)
        } catch (usageError) {
          console.warn("Error incrementing usage:", usageError)
        }

        if (!isAdmin && newUsage >= 2) {
          setUsageLimitReached(true)
        }
      }

      console.log("🚀 Enviando petición a la API de OpenAI...", { isRetry, retryCount, searchQuery, mealType, dishOrder, dayName })
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 70000) // 70 segundos timeout

      const response = await fetch("/api/generate-recipe-suggestions-alt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: searchQuery.trim(),
          mealType,
          dishOrder,
          dayName,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      console.log(`⏱️ Tiempo de respuesta OpenAI: ${elapsed} ms, status:`, response.status)

      if (!response.ok) {
        let errorMessage = `Error ${response.status}`
        let errorCode = "UNKNOWN_ERROR"

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          errorCode = errorData.code || errorCode

          if (errorData.details) {
            console.error("Error details:", errorData.details)
          }
        } catch {
          const errorText = await response.text()
          if (errorText && errorText.length < 200) {
            errorMessage = errorText
          }
        }

        // Manejar errores específicos
        if (response.status === 503 || errorCode === "OPENAI_CONNECTION_FAILED") {
          throw new Error("El servicio de IA está temporalmente no disponible. Inténtalo en unos minutos.")
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("✅ Datos parseados de OpenAI:", {
        recipesCount: data.recipes?.length,
        duration: data.duration,
        fallback: data.fallback,
        data,
      })

      if (data.recipes && Array.isArray(data.recipes) && data.recipes.length > 0) {
        setSuggestions(data.recipes)

        toast({
          title: data.fallback ? "¡Sugerencia generada!" : "¡Sugerencias generadas!",
          description: data.fallback
            ? "Se generó una receta básica. Inténtalo con una búsqueda más específica."
            : `Se generaron ${data.recipes.length} recetas para ti.`,
        })

        if (!isAdmin && newUsage >= 2) {
          toast({
            title: "Último uso del día",
            description: "Has alcanzado el límite diario. Podrás usar la IA nuevamente mañana.",
            variant: "default",
          })
        }
      } else {
        throw new Error("No se pudieron generar recetas. Inténtalo con una búsqueda diferente.")
      }
    } catch (error) {
      console.error("❌ Error generando sugerencias con OpenAI:", error)

      let errorMessage = "No se pudieron generar sugerencias."

      if (error.name === "AbortError") {
        errorMessage = "La petición tardó demasiado. Inténtalo de nuevo."
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setLastError(errorMessage)

      // Mostrar opción de retry para ciertos errores
      const canRetry =
        retryCount < 2 &&
        (error.name === "AbortError" ||
          errorMessage.includes("temporalmente no disponible") ||
          errorMessage.includes("Failed to fetch"))

      toast({
        title: "Error al generar sugerencias",
        description: canRetry ? `${errorMessage} (Intento ${retryCount + 1}/3)` : errorMessage,
        variant: "destructive",
      })

      if (canRetry) {
        setRetryCount((prev) => prev + 1)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const retryGeneration = () => {
    generateSuggestions(true)
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
      const calories = calculateCalories(suggestion.ingredients)

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
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setSavedRecipes((prev) => new Set(prev).add(index))

      toast({
        title: "¡Receta guardada!",
        description: `"${suggestion.name}" se ha añadido a tu colección.`,
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
      const calories = calculateCalories(suggestion.ingredients)

      console.log("🔄 Creando nueva receta:", suggestion.name)

      toast({
        title: "Creando receta...",
        description: "Guardando la receta en tu colección...",
      })

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
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      console.log("✅ Receta creada exitosamente:", newRecipe)

      toast({
        title: "¡Receta creada y seleccionada!",
        description: `"${suggestion.name}" se ha añadido a tu colección y seleccionado para el menú.`,
      })

      // Llamar al callback INMEDIATAMENTE con la nueva receta
      console.log("📞 Llamando callback onRecipeCreated...")
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

  if (!user) {
    return null
  }

  const canRetry = retryCount < 2 && lastError && !isGenerating

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="px-3" title="Sugerir receta con IA">
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            <span className="truncate">Sugerencias de IA para {dayName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
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
                👑 Administrador: Generaciones ilimitadas
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-4">
            {lastError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {lastError}
                  {canRetry && (
                    <Button variant="outline" size="sm" onClick={retryGeneration} className="ml-2 h-6 px-2 text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reintentar ({retryCount + 1}/3)
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="search-query" className="text-sm font-medium">
                ¿Qué tipo de plato buscas?
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="search-query"
                  placeholder="ej: pasta italiana, pollo al horno, ensalada fresca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isGenerating && searchQuery.trim()) {
                      generateSuggestions()
                    }
                  }}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={() => generateSuggestions()}
                  disabled={isGenerating || !searchQuery.trim() || (!isAdmin && usageLimitReached)}
                  className="w-full sm:w-auto whitespace-nowrap"
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : !isAdmin && usageLimitReached ? (
                    "Límite alcanzado"
                  ) : (
                    <>
                      Generar
                      {!isAdmin && <span className="ml-2 text-xs opacity-75">({dailyUsage}/2)</span>}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isGenerating && (
              <div className="text-center py-6">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-3 text-purple-500" />
                <p className="text-sm text-muted-foreground">Generando 3 sugerencias personalizadas...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Esto puede tardar hasta 60 segundos
                  {retryCount > 0 && ` (Intento ${retryCount + 1}/3)`}
                </p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm sm:text-base">Elige una opción o guarda las que te gusten:</h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow border-2 hover:border-purple-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm sm:text-base flex items-start gap-2">
                          <span className="bg-purple-100 text-purple-700 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="line-clamp-2">{suggestion.name}</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">
                          {suggestion.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div>
                          <h4 className="font-medium text-xs sm:text-sm mb-2 text-green-700">🥘 Ingredientes:</h4>
                          <div className="text-xs sm:text-sm text-muted-foreground max-h-24 sm:max-h-32 overflow-y-auto">
                            <ul className="list-disc list-inside space-y-0.5">
                              {suggestion.ingredients
                                .split("\n")
                                .filter((ingredient) => ingredient.trim())
                                .slice(0, 6) // Limitar a 6 ingredientes en móvil
                                .map((ingredient, idx) => (
                                  <li key={idx} className="text-xs sm:text-sm line-clamp-1">
                                    {ingredient.trim()}
                                  </li>
                                ))}
                              {suggestion.ingredients.split("\n").filter((ingredient) => ingredient.trim()).length >
                                6 && (
                                <li className="text-xs text-muted-foreground italic">
                                  +
                                  {suggestion.ingredients.split("\n").filter((ingredient) => ingredient.trim()).length -
                                    6}{" "}
                                  más...
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-xs sm:text-sm mb-2 text-blue-700">👨‍🍳 Preparación:</h4>
                          <div className="text-xs sm:text-sm text-muted-foreground max-h-24 sm:max-h-40 overflow-y-auto">
                            <div className="space-y-1">
                              {suggestion.preparation
                                .split("\n")
                                .filter((step) => step.trim())
                                .slice(0, 3) // Limitar a 3 pasos en móvil
                                .map((step, idx) => (
                                  <p key={idx} className="text-xs sm:text-sm leading-relaxed line-clamp-2">
                                    <span className="font-medium text-blue-600">{idx + 1}.</span> {step.trim()}
                                  </p>
                                ))}
                              {suggestion.preparation.split("\n").filter((step) => step.trim()).length > 3 && (
                                <p className="text-xs text-muted-foreground italic">
                                  +{suggestion.preparation.split("\n").filter((step) => step.trim()).length - 3} pasos
                                  más...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <Button
                            onClick={() => saveAndSelectRecipe(suggestion)}
                            disabled={isSaving}
                            className="flex-1 text-xs sm:text-sm"
                            size="sm"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                Creando...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Seleccionar para el menú</span>
                                <span className="sm:hidden">Seleccionar</span>
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => saveRecipeToCollection(suggestion, index)}
                            disabled={isSaving || savedRecipes.has(index)}
                            variant="outline"
                            size="sm"
                            className="sm:px-4 text-xs sm:text-sm"
                          >
                            {savedRecipes.has(index) ? (
                              <>
                                <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                <span className="hidden sm:inline">Guardada</span>
                                <span className="sm:hidden">✓</span>
                              </>
                            ) : isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                <span className="hidden sm:inline">Guardando...</span>
                                <span className="sm:hidden">...</span>
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Guardar</span>
                                <span className="sm:hidden">+</span>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
