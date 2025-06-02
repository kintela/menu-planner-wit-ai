"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface StarRatingProps {
  recipeId: number
}

export function StarRating({ recipeId }: StarRatingProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [totalRatings, setTotalRatings] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  // Fetch user's rating and average rating when component mounts
  useEffect(() => {
    async function fetchRatings() {
      try {
        // Get average rating for this recipe
        const { data: avgData, error: avgError } = await supabase
          .from("recipe_ratings")
          .select("rating")
          .eq("recipe_id", recipeId)

        if (avgError) throw avgError

        if (avgData && avgData.length > 0) {
          const sum = avgData.reduce((acc, curr) => acc + curr.rating, 0)
          setAverageRating(sum / avgData.length)
          setTotalRatings(avgData.length)
        }

        // If user is logged in, get their rating
        if (user) {
          const { data: userRatingData, error: userRatingError } = await supabase
            .from("recipe_ratings")
            .select("rating")
            .eq("recipe_id", recipeId)
            .eq("user_id", user.id)
            .single()

          if (userRatingError && userRatingError.code !== "PGRST116") {
            throw userRatingError
          }

          if (userRatingData) {
            setUserRating(userRatingData.rating)
            setRating(userRatingData.rating)
          }
        }
      } catch (error) {
        console.error("Error fetching ratings:", error)
      }
    }

    fetchRatings()
  }, [recipeId, user, supabase])

  const handleRating = async (value: number) => {
    if (!user) return

    try {
      setIsSubmitting(true)

      // Check if user has already rated this recipe
      const { data: existingRating, error: checkError } = await supabase
        .from("recipe_ratings")
        .select("id")
        .eq("recipe_id", recipeId)
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      let result

      if (existingRating) {
        // Update existing rating
        result = await supabase
          .from("recipe_ratings")
          .update({ rating: value, updated_at: new Date().toISOString() })
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)
      } else {
        // Insert new rating
        result = await supabase.from("recipe_ratings").insert({
          recipe_id: recipeId,
          user_id: user.id,
          rating: value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      if (result.error) throw result.error

      // Update local state
      setUserRating(value)
      setRating(value)

      // Refetch average rating
      const { data: avgData, error: avgError } = await supabase
        .from("recipe_ratings")
        .select("rating")
        .eq("recipe_id", recipeId)

      if (avgError) throw avgError

      if (avgData && avgData.length > 0) {
        const sum = avgData.reduce((acc, curr) => acc + curr.rating, 0)
        setAverageRating(sum / avgData.length)
        setTotalRatings(avgData.length)
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center mb-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={20}
            className={`cursor-pointer transition-colors ${
              (
                hover !== null
                  ? hover >= star
                  : rating !== null
                    ? rating >= star
                    : averageRating !== null
                      ? averageRating >= star
                      : false
              )
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            } ${!user ? "opacity-70 cursor-not-allowed" : ""}`}
            onClick={() => user && handleRating(star)}
            onMouseEnter={() => user && setHover(star)}
            onMouseLeave={() => user && setHover(null)}
          />
        ))}
      </div>
      <div className="text-xs text-center text-muted-foreground">
        {user ? (
          userRating ? (
            <span>Tu puntuación: {userRating}/5</span>
          ) : (
            <span>¡Puntúa esta receta!</span>
          )
        ) : (
          <span>Inicia sesión para puntuar</span>
        )}
        {averageRating !== null && (
          <div className="mt-1">
            <span>
              {averageRating.toFixed(1)}/5 ({totalRatings} {totalRatings === 1 ? "voto" : "votos"})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
