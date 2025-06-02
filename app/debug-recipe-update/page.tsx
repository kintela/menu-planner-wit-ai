"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function DebugRecipeUpdatePage() {
  const [recipeId, setRecipeId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testUpdate = async () => {
    if (!recipeId) {
      alert("Por favor, introduce un ID de receta")
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Primero obtener la receta actual
      const getResponse = await fetch(`/api/recipes/${recipeId}`)
      const currentRecipe = await getResponse.json()

      if (!getResponse.ok) {
        setResult({ error: "Error al obtener la receta", details: currentRecipe })
        return
      }

      // Hacer una actualización mínima (solo el timestamp)
      const updateData = {
        title: currentRecipe.title + " (actualizada)",
        updated_at: new Date().toISOString(),
      }

      const updateResponse = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      const updateResult = await updateResponse.json()

      setResult({
        success: updateResponse.ok,
        originalRecipe: currentRecipe,
        updateData,
        result: updateResult,
        status: updateResponse.status,
      })
    } catch (error) {
      setResult({
        error: "Error de red",
        details: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Debug Actualización de Recetas</h1>
        <p className="text-gray-600 mt-2">Prueba la funcionalidad de actualización de recetas</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Test de Actualización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipeId">ID de la Receta</Label>
              <Input
                id="recipeId"
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                placeholder="Ej: 123"
                type="number"
              />
            </div>

            <Button onClick={testUpdate} disabled={loading || !recipeId}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Probando...
                </>
              ) : (
                "Probar Actualización"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
