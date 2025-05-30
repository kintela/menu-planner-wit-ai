"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function DebugRecipeUpdatePage() {
  const [recipeId, setRecipeId] = useState("80")
  const [testName, setTestName] = useState("Receta de prueba actualizada")
  const [testIngredients, setTestIngredients] = useState("Ingrediente 1\nIngrediente 2\nIngrediente 3")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const { toast } = useToast()

  const addResult = (operation: string, success: boolean, data: any, error?: any) => {
    const result = {
      timestamp: new Date().toISOString(),
      operation,
      success,
      data,
      error: error?.message || error,
    }
    setResults((prev) => [result, ...prev])
    console.log("Debug result:", result)
  }

  const testReadRecipe = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("recipes").select("*").eq("id", recipeId).single()

      addResult("READ RECIPE", !error, data, error)

      if (error) {
        toast({
          title: "Error al leer receta",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Receta leída correctamente",
          description: `Nombre: ${data.name}`,
        })
      }
    } catch (error) {
      addResult("READ RECIPE", false, null, error)
    }
  }

  const testUpdateRecipe = async () => {
    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()

      const updateData = {
        name: testName,
        ingredients: testIngredients,
        preparation: "Preparación de prueba actualizada",
      }

      console.log("Intentando actualizar con datos:", updateData)

      const { data, error } = await supabase.from("recipes").update(updateData).eq("id", recipeId).select()

      addResult("UPDATE RECIPE", !error, data, error)

      if (error) {
        toast({
          title: "Error al actualizar receta",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Receta actualizada correctamente",
          description: "Los datos se han guardado en la base de datos",
        })
      }
    } catch (error) {
      addResult("UPDATE RECIPE", false, null, error)
    } finally {
      setIsLoading(false)
    }
  }

  const testSupabaseConnection = async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("recipes").select("count", { count: "exact" })

      addResult("CONNECTION TEST", !error, { count: data }, error)

      if (error) {
        toast({
          title: "Error de conexión",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Conexión exitosa",
          description: `Se encontraron ${data?.length || 0} recetas`,
        })
      }
    } catch (error) {
      addResult("CONNECTION TEST", false, null, error)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug: Actualización de Recetas</h1>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Configuración de Prueba</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipe-id">ID de Receta</Label>
            <Input id="recipe-id" value={recipeId} onChange={(e) => setRecipeId(e.target.value)} placeholder="80" />
          </div>

          <div>
            <Label htmlFor="test-name">Nombre de Prueba</Label>
            <Input
              id="test-name"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Nombre de la receta"
            />
          </div>

          <div>
            <Label htmlFor="test-ingredients">Ingredientes de Prueba</Label>
            <Textarea
              id="test-ingredients"
              value={testIngredients}
              onChange={(e) => setTestIngredients(e.target.value)}
              placeholder="Lista de ingredientes"
              className="min-h-24"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Pruebas</h2>
        <div className="flex gap-4 flex-wrap">
          <Button onClick={testSupabaseConnection}>Probar Conexión</Button>

          <Button onClick={testReadRecipe}>Leer Receta</Button>

          <Button onClick={testUpdateRecipe} disabled={isLoading} variant="default">
            {isLoading ? "Actualizando..." : "Actualizar Receta"}
          </Button>

          <Button onClick={clearResults} variant="outline">
            Limpiar Resultados
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Resultados</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-muted-foreground">No hay resultados aún. Ejecuta una prueba.</p>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{result.operation}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className={`text-sm ${result.success ? "text-green-700" : "text-red-700"}`}>
                  {result.success ? "✅ Éxito" : "❌ Error"}
                </div>

                {result.data && (
                  <div className="mt-2">
                    <strong>Datos:</strong>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}

                {result.error && (
                  <div className="mt-2">
                    <strong>Error:</strong>
                    <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(result.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
