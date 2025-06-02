"use client"

import { useState, useEffect } from "react"
import { Star, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StarRatingProps {
  recipeId: number
  creatorId?: string // ID del creador de la receta
}

export function StarRating({ recipeId, creatorId }: StarRatingProps) {
  const [userRating, setUserRating] = useState<number>(0)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  // Determinar si el usuario es el creador de la receta
  const isCreator = user?.id === creatorId

  // Load existing ratings
  useEffect(() => {
    const loadRatings = async () => {
      try {
        // Get all ratings for this recipe to calculate average
        const { data: allRatings, error: ratingsError } = await supabase
          .from("recipe_ratings")
          .select("rating")
          .eq("recipe_id", recipeId)

        if (ratingsError) {
          console.error("Error loading ratings:", ratingsError)
          return
        }

        if (allRatings && allRatings.length > 0) {
          const total = allRatings.length
          const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0)
          const average = sum / total

          setAverageRating(Math.round(average * 10) / 10)
          setTotalRatings(total)
        } else {
          setAverageRating(0)
          setTotalRatings(0)
        }

        // Get user's rating if logged in and not the creator
        if (user && !isCreator) {
          const { data: userRatingData, error: userRatingError } = await supabase
            .from("recipe_ratings")
            .select("rating")
            .eq("recipe_id", recipeId)
            .eq("user_id", user.id)
            .maybeSingle()

          if (userRatingError) {
            console.error("Error loading user rating:", userRatingError)
            return
          }

          if (userRatingData) {
            setUserRating(userRatingData.rating)
          } else {
            setUserRating(0)
          }
        }
      } catch (error) {
        console.error("Error in loadRatings:", error)
      }
    }

    loadRatings()
  }, [recipeId, user, supabase, isCreator])

  const handleStarClick = async (starValue: number) => {
    if (!user || isSubmitting || isCreator) return

    setIsSubmitting(true)

    try {
      // Check if user already has a rating for this recipe
      const { data: existingRating, error: checkError } = await supabase
        .from("recipe_ratings")
        .select("id, rating")
        .eq("recipe_id", recipeId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing rating:", checkError)
        return
      }

      let result
      if (existingRating) {
        // Update existing rating
        result = await supabase
          .from("recipe_ratings")
          .update({
            rating: starValue,
            updated_at: new Date().toISOString(),
          })
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)
      } else {
        // Insert new rating
        result = await supabase.from("recipe_ratings").insert({
          recipe_id: recipeId,
          user_id: user.id,
          rating: starValue,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      if (result.error) {
        console.error("Error saving rating:", result.error)
        return
      }

      // Update local state
      setUserRating(starValue)

      // Reload all ratings to get updated average
      const { data: allRatings, error: ratingsError } = await supabase
        .from("recipe_ratings")
        .select("rating")
        .eq("recipe_id", recipeId)

      if (!ratingsError && allRatings) {
        const total = allRatings.length
        const sum = allRatings.reduce((acc, curr) => acc + curr.rating, 0)
        const average = sum / total

        setAverageRating(Math.round(average * 10) / 10)
        setTotalRatings(total)
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayRating = hoveredStar || userRating || 0

  return (
    <div className="flex flex-col items-center space-y-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!user || isSubmitting || isCreator}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => user && !isCreator && setHoveredStar(star)}
            onMouseLeave={() => user && !isCreator && setHoveredStar(0)}
            className={`transition-all duration-150 ${
              !user || isCreator ? "cursor-not-allowed opacity-50" : "hover:scale-110 cursor-pointer"
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
        {!user ? (
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

        {totalRatings > 0 && (
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
