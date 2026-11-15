"use client"

import { useCallback, useEffect, useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { buildJsonRequest, ratingResultMessage } from "@/lib/recipes/recipe-ui"

interface RatingPayload {
  rating_average?: number | null
  rating_count?: number
  my_rating?: number | null
  average?: number | null
  count?: number
  own_rating?: number | null
  rating?: number
  removed?: boolean
  error?: string
}

interface StarRatingProps {
  recipeId: number
  average?: number | null
  count?: number
  myRating?: number | null
  canRate?: boolean
}

export function StarRating({ recipeId, average = null, count = 0, myRating = null, canRate = false }: StarRatingProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [aggregate, setAggregate] = useState({ average, count })
  const [ownRating, setOwnRating] = useState(myRating)
  const [submitting, setSubmitting] = useState(false)

  const applyPayload = (payload: RatingPayload) => {
    setAggregate({ average: payload.average ?? payload.rating_average ?? null, count: payload.count ?? payload.rating_count ?? 0 })
    if (Object.hasOwn(payload, "own_rating")) setOwnRating(payload.own_rating ?? null)
    else if (Object.hasOwn(payload, "my_rating")) setOwnRating(payload.my_rating ?? null)
  }

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`, { method: "GET" })
      const payload = await response.json()
      if (response.ok) applyPayload(payload)
    } catch {
      // The server-rendered aggregate remains visible if refreshing it fails.
    }
  }, [recipeId])

  useEffect(() => { void load() }, [load])

  const rate = async (rating: number) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`, buildJsonRequest("PUT", { rating }))
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        setOwnRating(payload.rating ?? rating)
        await load()
      }
      toast({ title: response.ok ? "Valoración guardada" : "No se pudo valorar", description: ratingResultMessage(response.ok, payload), variant: response.ok ? undefined : "destructive" })
    } catch {
      toast({ title: "No se pudo valorar", description: "No se pudo contactar con el servidor.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`, buildJsonRequest("DELETE"))
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        setOwnRating(null)
        await load()
      }
      toast({ title: response.ok ? "Valoración retirada" : "No se pudo retirar", description: ratingResultMessage(response.ok, { ...payload, removed: response.ok }), variant: response.ok ? undefined : "destructive" })
    } catch {
      toast({ title: "No se pudo retirar", description: "No se pudo contactar con el servidor.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const controlsVisible = Boolean(user && canRate)
  return (
    <div className="space-y-2" aria-label={`${aggregate.count} valoraciones`}>
      <p className="text-sm text-amber-700">
        {aggregate.count > 0 ? `★ ${aggregate.average?.toFixed(1)} (${aggregate.count})` : "Sin valoraciones (0)"}
      </p>
      {controlsVisible && (
        <div className="flex flex-wrap items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" disabled={submitting} onClick={() => rate(value)} aria-label={`Valorar con ${value}`}>
              <Star className={`h-5 w-5 ${value <= (ownRating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
            </button>
          ))}
          {ownRating != null && <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={remove}>Retirar valoración</Button>}
        </div>
      )}
      {user && !canRate && <p className="text-xs text-muted-foreground">No puedes valorar tu propia receta.</p>}
    </div>
  )
}
