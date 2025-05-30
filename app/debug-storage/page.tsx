"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function DebugStoragePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testStorage = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug-storage")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error desconocido")
      }

      setResult(data)
    } catch (err) {
      console.error("Error testing storage:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const testImageUpload = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Crear un archivo de imagen de prueba
      const canvas = document.createElement("canvas")
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.fillStyle = "blue"
        ctx.fillRect(0, 0, 200, 200)
        ctx.fillStyle = "white"
        ctx.font = "20px Arial"
        ctx.fillText("Test Image", 50, 100)
      }

      // Convertir el canvas a un blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/png")
      })

      // Crear un archivo a partir del blob
      const file = new File([blob], "test-image.png", { type: "image/png" })

      // Crear FormData y añadir el archivo
      const formData = new FormData()
      formData.append("file", file)

      // Enviar la solicitud
      const response = await fetch("/api/upload-image?recipeId=test", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error desconocido")
      }

      setResult(data)
    } catch (err) {
      console.error("Error testing image upload:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Diagnóstico de Almacenamiento</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Probar Funcionalidad de Almacenamiento</CardTitle>
            <CardDescription>Verifica la configuración y permisos del almacenamiento de Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testStorage} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Probando...
                </>
              ) : (
                "Probar Almacenamiento"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Probar Subida de Imágenes</CardTitle>
            <CardDescription>Verifica la funcionalidad de subida de imágenes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testImageUpload} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Probar Subida de Imagen"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <h3 className="font-bold mb-2">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <pre className="p-4 bg-gray-50 border rounded-md overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>

          {result.testFile?.publicUrl && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Archivo de prueba:</h4>
              <a
                href={result.testFile.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {result.testFile.publicUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
