"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  recipeId: number
  className?: string
}

export function StarRating({ recipeId, className }: StarRatingProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  // Cargar ratings existentes
  useEffect(() => {
    const loadRatings = async () => {
      try {
        // Obtener rating promedio y total
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("recipe_ratings")
          .select("rating")
          .eq("recipe_id", recipeId)

        if (ratingsError) {
          console.error("Error loading ratings:", ratingsError)
          return
        }

        if (ratingsData && ratingsData.length > 0) {
          const total = ratingsData.length
          const average = ratingsData.reduce((sum, r) => sum + r.rating, 0) / total
          setAverageRating(Math.round(average * 10) / 10)
          setTotalRatings(total)
        }

        // Obtener rating del usuario actual si está logueado
        if (user) {
          const { data: userRatingData, error: userRatingError } = await supabase
            .from("recipe_ratings")
            .select("rating")
            .eq("recipe_id", recipeId)
            .eq("user_id", user.id)
            .single()

          if (userRatingData && !userRatingError) {
            setUserRating(userRatingData.rating)
            setRating(userRatingData.rating)
          }
        }
      } catch (error) {
        console.error("Error loading ratings:", error)
      }
    }

    loadRatings()
  }, [recipeId, user, supabase])

  const handleStarClick = async (starValue: number) => {
    if (!user || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Verificar si el usuario ya ha puntuado esta receta
      const { data: existingRating, error: checkError } = await supabase
        .from("recipe_ratings")
        .select("id")
        .eq("recipe_id", recipeId)
        .eq("user_id", user.id)
        .single()

      if (existingRating) {
        // Actualizar rating existente
        const { error: updateError } = await supabase
          .from("recipe_ratings")
          .update({
            rating: starValue,
            updated_at: new Date().toISOString(),
          })
          .eq("recipe_id", recipeId)
          .eq("user_id", user.id)

        if (updateError) {
          console.error("Error updating rating:", updateError)
          return
        }
      } else {
        // Crear nuevo rating
        const { error: insertError } = await supabase.from("recipe_ratings").insert({
          recipe_id: recipeId,
          user_id: user.id,
          rating: starValue,
        })

        if (insertError) {
          console.error("Error inserting rating:", insertError)
          return
        }
      }

      setRating(starValue)
      setUserRating(starValue)

      // Recargar estadísticas
      const { data: ratingsData } = await supabase.from("recipe_ratings").select("rating").eq("recipe_id", recipeId)

      if (ratingsData && ratingsData.length > 0) {
        const total = ratingsData.length
        const average = ratingsData.reduce((sum, r) => sum + r.rating, 0) / total
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
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!user || isSubmitting}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => user && setHoveredStar(star)}
            onMouseLeave={() => user && setHoveredStar(0)}
            className={cn(
              "transition-colors duration-150",
              !user && "cursor-not-allowed opacity-50",
              user && "hover:scale-110 transition-transform",
            )}
          >
            <Star
              className={cn(
                "h-4 w-4",
                star <= displayRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300",
                user && "hover:text-yellow-400",
              )}
            />
          </button>
        ))}
      </div>

      {/* Mostrar información de rating */}
      <div className="text-xs text-muted-foreground">
        {totalRatings > 0 ? (
          <span>
            {averageRating}/5 ({totalRatings} {totalRatings === 1 ? "voto" : "votos"})
          </span>
        ) : (
          <span>Sin puntuaciones</span>
        )}
      </div>

      {!user && <div className="text-xs text-muted-foreground italic">Inicia sesión para puntuar</div>}
    </div>
  )
}
