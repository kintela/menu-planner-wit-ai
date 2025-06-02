"use client"

import { useState } from "react"

interface RecipeImageProps {
  src: string | null
  alt: string
  className?: string
}

export function RecipeImage({ src, alt, className = "" }: RecipeImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground">Sin imagen disponible</span>
      </div>
    )
  }

  return (
    <img
      src={src || "/placeholder.svg"}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  )
}
