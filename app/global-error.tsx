"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Error global</h2>
          <p className="text-muted-foreground mb-6">Ha ocurrido un error inesperado en la aplicación.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
