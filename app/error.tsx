"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h2 className="text-3xl font-bold mb-4">Algo salió mal</h2>
      <p className="text-muted-foreground mb-6">Ha ocurrido un error inesperado. Por favor, intenta de nuevo.</p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
