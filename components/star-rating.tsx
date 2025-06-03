"use client"

import { useState, useEffect, useCallback } from "react"
import { Star, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StarRatingProps {
  recipeId: number
  creatorId?: string // ID del creador de la receta
}

// Utility function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Utility function to retry with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1
      const isTooManyRequests =
        error.message?.includes("Too Many R") || error.message?.includes("rate limit") || error.message?.includes("429")

      if (isLastAttempt || !isTooManyRequests) {
        throw error
      }

      // Exponential backoff with jitter
      const delayMs = baseDelay * Math.pow(2, i) + Math.random() * 1000
      console.log(`Rate limited, retrying in ${delayMs}ms (attempt ${i + 1}/${maxRetries})`)
      await delay(delayMs)
    }
  }
}

export function StarRating({ recipeId, creatorId }: StarRatingProps) {
  const [userRating, setUserRating] = useState<number>(0)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  // Determinar si el usuario es el creador de la receta
  const isCreator = user?.id === creatorId

  // Load existing ratings with retry logic
  const loadRatings = useCallback(async () => {
    if (!recipeId) return

    setIsLoading(true)
    setHasError(false)

    try {
      // Add a small random delay to spread out requests
      await delay(Math.random() * 500)

      // Get all ratings for this recipe to calculate average
      const allRatingsResult = await retryWithBackoff(async () => {
        const { data, error } = await supabase.from("recipe_ratings").select("rating").eq("recipe_id", recipeId)

        if (error) throw error
        return data
      })

      if (allRatingsResult && allRatingsResult.length > 0) {
        const total = allRatingsResult.length
        const sum = allRatingsResult.reduce((acc, curr) => acc + curr.rating, 0)
        const average = sum / total

        setAverageRating(Math.round(average * 10) / 10)
        setTotalRatings(total)
      } else {
        setAverageRating(0)
        setTotalRatings(0)
      }

      // Get user's rating if logged in and not the creator
      if (user && !isCreator) {
        try {
          const userRatingResult = await retryWithBackoff(async () => {
            const { data, error } = await supabase
              .from("recipe_ratings")
              .select("rating")
              .eq("recipe_id", recipeId)
              .eq("user_id", user.id)
              .maybeSingle()

            if (error) throw error
            return data
          })

          if (userRatingResult) {
            setUserRating(userRatingResult.rating)
          } else {
            setUserRating(0)
          }
        } catch (userError) {
          console.warn("Could not load user rating:", userError)
          // Don't fail the whole component for user rating errors
        }
      }
    } catch (error) {
      console.error("Error loading ratings for recipe", recipeId, ":", error)
      setHasError(true)
      // Set default values so component still works
      setAverageRating(0)
      setTotalRatings(0)
      setUserRating(0)
    } finally {
      setIsLoading(false)
    }
  }, [recipeId, user, supabase, isCreator])

  useEffect(() => {
    loadRatings()
  }, [loadRatings])

  const handleStarClick = async (starValue: number) => {
    if (!user || isSubmitting || isCreator) return

    setIsSubmitting(true)

    try {
      // Check if user already has a rating for this recipe
      const existingRating = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from("recipe_ratings")
          .select("id, rating")
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)
          .maybeSingle()

        if (error) throw error
        return data
      })

      let result
      if (existingRating) {
        // Update existing rating
        result = await retryWithBackoff(async () => {
          const { error } = await supabase
            .from("recipe_ratings")
            .update({
              rating: starValue,
              updated_at: new Date().toISOString(),
            })
            .eq("recipe_id", recipeId)
            .eq("user_id", user.id)

          if (error) throw error
          return { error: null }
        })
      } else {
        // Insert new rating
        result = await retryWithBackoff(async () => {
          const { error } = await supabase.from("recipe_ratings").insert({
            recipe_id: recipeId,
            user_id: user.id,
            rating: starValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (error) throw error
          return { error: null }
        })
      }

      if (result.error) {
        console.error("Error saving rating:", result.error)
        return
      }

      // Update local state immediately for better UX
      setUserRating(starValue)

      // Reload ratings in background
      setTimeout(() => {
        loadRatings()
      }, 1000)
    } catch (error) {
      console.error("Error submitting rating:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoveredStar || userRating || 0

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-1">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-4 w-4 text-gray-300 animate-pulse" />
          ))}
        </div>
        <div className="text-xs text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!user || isSubmitting || isCreator || hasError}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => user && !isCreator && !hasError && setHoveredStar(star)}
            onMouseLeave={() => user && !isCreator && !hasError && setHoveredStar(0)}
            className={`transition-all duration-150 ${
              !user || isCreator || hasError ? "cursor-not-allowed opacity-50" : "hover:scale-110 cursor-pointer"
            }`}
          >
            <Star
              className={`h-4 w-4 transition-colors ${
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : star <= averageRating && !hoveredStar && !userRating
                    ? "fill-yellow-200 text-yellow-200"
                    : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="text-xs text-center text-muted-foreground">
        {hasError ? (
          <button onClick={loadRatings} className="text-blue-500 hover:text-blue-700 underline">
            Error - Reintentar
          </button>
        ) : !user ? (
          <span>Inicia sesión para puntuar</span>
        ) : isCreator ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-amber-500">
                  <AlertCircle className="h-3 w-3" />
                  <span>No puedes puntuar tu propia receta</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Para mantener un sistema justo, no puedes puntuar recetas que has creado tú mismo.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : userRating > 0 ? (
          <span>Tu puntuación: {userRating}/5</span>
        ) : (
          <span>¡Puntúa esta receta!</span>
        )}

        {totalRatings > 0 && !hasError && (
          <div className="mt-1">
            <span>
              {averageRating}/5 ({totalRatings} {totalRatings === 1 ? "voto" : "votos"})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
