"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestDbPage() {
  const [recipeId, setRecipeId] = useState("")
  const [imageUrl, setImageUrl] = useState("https://example.com/test-image.jpg")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testDbUpdate = async () => {
    if (!recipeId) {
      alert("Por favor, introduce un ID de receta")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/test-db-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: Number.parseInt(recipeId),
          imageUrl: imageUrl,
        }),
      })

      const data = await response.json()
      setResult(data)
      console.log("Test result:", data)
    } catch (error) {
      console.error("Error testing DB update:", error)
      setResult({ error: error instanceof Error ? error.message : "Error desconocido" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test de Actualización de Base de Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipeId">ID de la Receta</Label>
            <Input
              id="recipeId"
              type="number"
              placeholder="ej: 77"
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL de Imagen de Prueba</Label>
            <Input id="imageUrl" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>

          <Button onClick={testDbUpdate} disabled={isLoading}>
            {isLoading ? "Probando..." : "Probar Actualización de BD"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Resultado del Test:</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
