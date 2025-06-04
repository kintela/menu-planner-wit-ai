"use client"

import { useState, useEffect, useCallback } from "react"
import { Star, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { safeQuery } from "@/lib/supabase/rate-limiter"

interface StarRatingProps {
  recipeId: number
  creatorId?: string // ID del creador de la receta
}

// Utility function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function StarRating({ recipeId, creatorId }: StarRatingProps) {
  const [userRating, setUserRating] = useState<number>(0)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const [retryCount, setRetryCount] = useState(0)

  const { user } = useAuth()
  const supabase = createClient()

  // Determinar si el usuario es el creador de la receta
  const isCreator = user?.id === creatorId

  // Load existing ratings with rate limiting protection
  const loadRatings = useCallback(async () => {
    if (!recipeId) return

    setIsLoading(true)
    setHasError(false)

    try {
      // Add a small random delay to spread out requests

      await delay(Math.random() * 300 + retryCount * 500)


      // Get all ratings for this recipe to calculate average
      try {
        const result = await safeQuery(
          async () => {

            try {
              const { data, error } = await supabase.from("recipe_ratings").select("rating").eq("recipe_id", recipeId)
              if (error) throw error
              return { data, error: null }
            } catch (innerError) {
              console.error("Inner error in ratings query:", innerError)
              return { data: null, error: innerError }
            }

          },
          { endpoint: "recipe_ratings", maxRetries: 3, baseDelay: 1000 },
        )

        if (result.data && result.data.length > 0) {
          const total = result.data.length
          const sum = result.data.reduce((acc, curr) => acc + curr.rating, 0)
          const average = sum / total

          setAverageRating(Math.round(average * 10) / 10)
          setTotalRatings(total)
        } else {
          setAverageRating(0)
          setTotalRatings(0)
        }
      } catch (error) {
        console.warn("Error loading ratings:", error)
        // Continue with defaults
        setAverageRating(0)
        setTotalRatings(0)
      }

      // Get user's rating if logged in and not the creator
      if (user && !isCreator) {
        try {
          const userRatingResult = await safeQuery(
            async () => {

              try {
                const { data, error } = await supabase
                  .from("recipe_ratings")
                  .select("rating")
                  .eq("recipe_id", recipeId)
                  .eq("user_id", user.id)
                  .maybeSingle()

                if (error) throw error
                return { data, error: null }
              } catch (innerError) {
                console.error("Inner error in user rating query:", innerError)
                return { data: null, error: innerError }
              }

            },
            { endpoint: "user_rating", maxRetries: 2, baseDelay: 800 },
          )

          if (userRatingResult.data) {
            setUserRating(userRatingResult.data.rating)
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

  }, [recipeId, user, supabase, isCreator, retryCount])


  useEffect(() => {
    loadRatings()
  }, [loadRatings])

  const handleStarClick = async (starValue: number) => {
    if (!user || isSubmitting || isCreator) return

    setIsSubmitting(true)

    try {
      // Check if user already has a rating for this recipe
      const existingRating = await safeQuery(
        async () => {

          try {
            const { data, error } = await supabase
              .from("recipe_ratings")
              .select("id, rating")
              .eq("recipe_id", recipeId)
              .eq("user_id", user.id)
              .maybeSingle()

            if (error) throw error
            return { data, error: null }
          } catch (innerError) {
            console.error("Inner error in check rating query:", innerError)
            return { data: null, error: innerError }
          }

        },
        { endpoint: "check_rating", maxRetries: 2, baseDelay: 800 },
      )

      if (existingRating.data) {
        // Update existing rating
        await safeQuery(
          async () => {

            try {
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
            } catch (innerError) {
              console.error("Inner error in update rating query:", innerError)
              return { error: innerError }
            }

          },
          { endpoint: "update_rating", maxRetries: 2, baseDelay: 1000 },
        )
      } else {
        // Insert new rating
        await safeQuery(
          async () => {

            try {
              const { error } = await supabase.from("recipe_ratings").insert({
                recipe_id: recipeId,
                user_id: user.id,
                rating: starValue,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })

              if (error) throw error
              return { error: null }
            } catch (innerError) {
              console.error("Inner error in insert rating query:", innerError)
              return { error: innerError }
            }

          },
          { endpoint: "insert_rating", maxRetries: 2, baseDelay: 1000 },
        )
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

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
    loadRatings()
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

          <button onClick={handleRetry} className="text-blue-500 hover:text-blue-700 underline">

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
