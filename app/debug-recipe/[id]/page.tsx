"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"

interface DebugRecipeInfo {
  recipe: any
  creator: any
  debug: any
  error?: string
}

export default function DebugRecipePage({ params }: { params: { id: string } }) {
  const [debugInfo, setDebugInfo] = useState<DebugRecipeInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/debug-recipe/${params.id}`)
      const data = await response.json()

      if (!response.ok) {
        setDebugInfo({ recipe: null, creator: null, debug: null, error: data.error || "Error desconocido" })
      } else {
        setDebugInfo(data)
      }
    } catch (error) {
      console.error("Error loading debug info:", error)
      setDebugInfo({
        recipe: null,
        creator: null,
        debug: null,
        error: error instanceof Error ? error.message : "Error de red",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [params.id])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando información de debug...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Receta #{params.id}</h1>
          <p className="text-gray-600 mt-2">Información detallada de la receta</p>
        </div>
        <Button onClick={loadDebugInfo} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {debugInfo?.error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{debugInfo.error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información de la Receta */}
          <Card>
            <CardHeader>
              <CardTitle>Receta</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo?.recipe ? (
                <div className="space-y-2">
                  <p>
                    <strong>ID:</strong> {debugInfo.recipe.id}
                  </p>
                  <p>
                    <strong>Título:</strong> {debugInfo.recipe.title}
                  </p>
                  <p>
                    <strong>Categoría:</strong> {debugInfo.recipe.category || "Sin categoría"}
                  </p>
                  <p>
                    <strong>Dificultad:</strong> {debugInfo.recipe.difficulty}
                  </p>
                  <p>
                    <strong>Tiempo prep:</strong> {debugInfo.recipe.prep_time} min
                  </p>
                  <p>
                    <strong>Tiempo cocción:</strong> {debugInfo.recipe.cook_time} min
                  </p>
                  <p>
                    <strong>Porciones:</strong> {debugInfo.recipe.servings}
                  </p>
                  <p>
                    <strong>Creado:</strong> {new Date(debugInfo.recipe.created_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Actualizado:</strong>{" "}
                    {debugInfo.recipe.updated_at ? new Date(debugInfo.recipe.updated_at).toLocaleString() : "Nunca"}
                  </p>
                  <p>
                    <strong>Imagen:</strong> {debugInfo.recipe.image_url ? "Sí" : "No"}
                  </p>
                  <p>
                    <strong>Ingredientes:</strong> {debugInfo.recipe.ingredients?.length || 0}
                  </p>
                  <p>
                    <strong>Instrucciones:</strong> {debugInfo.recipe.instructions?.length || 0}
                  </p>
                  <p>
                    <strong>Tags:</strong> {debugInfo.recipe.tags?.length || 0}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No se pudo cargar la receta</p>
              )}
            </CardContent>
          </Card>

          {/* Información del Creador */}
          <Card>
            <CardHeader>
              <CardTitle>Creador</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo?.creator ? (
                <div className="space-y-2">
                  <p>
                    <strong>ID:</strong> {debugInfo.creator.id}
                  </p>
                  <p>
                    <strong>Email:</strong> {debugInfo.creator.email}
                  </p>
                  <p>
                    <strong>Nombre:</strong> {debugInfo.creator.full_name || "No definido"}
                  </p>
                  <p>
                    <strong>Alias:</strong> {debugInfo.creator.alias || "No definido"}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No se pudo cargar información del creador</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Datos Raw */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Datos Raw (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">{JSON.stringify(debugInfo, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
