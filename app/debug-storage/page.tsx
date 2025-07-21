"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { ClientOnlyDateTime } from "../../components/ClientOnlyDateTime"

interface StorageDebugInfo {
  buckets: any[]
  recipeImagesFiles: any[]
  avatarsFiles: any[]
  debug: any
  error?: string
}

export default function DebugStoragePage() {
  const [debugInfo, setDebugInfo] = useState<StorageDebugInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug-storage")
      const data = await response.json()

      if (!response.ok) {
        setDebugInfo({
          buckets: [],
          recipeImagesFiles: [],
          avatarsFiles: [],
          debug: null,
          error: data.error || "Error desconocido",
        })
      } else {
        setDebugInfo(data)
      }
    } catch (error) {
      console.error("Error loading debug info:", error)
      setDebugInfo({
        buckets: [],
        recipeImagesFiles: [],
        avatarsFiles: [],
        debug: null,
        error: error instanceof Error ? error.message : "Error de red",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando información de almacenamiento...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Almacenamiento</h1>
          <p className="text-gray-600 mt-2">Información detallada del almacenamiento de Supabase</p>
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
        <div className="space-y-6">
          {/* Buckets */}
          <Card>
            <CardHeader>
              <CardTitle>Buckets de Almacenamiento</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo?.buckets && debugInfo.buckets.length > 0 ? (
                <div className="space-y-4">
                  {debugInfo.buckets.map((bucket, index) => (
                    <div key={index} className="border rounded p-4">
                      <h3 className="font-semibold">{bucket.name}</h3>
                      <p className="text-sm text-gray-600">ID: {bucket.id}</p>
                      <p className="text-sm text-gray-600">Público: {bucket.public ? "Sí" : "No"}</p>
                      <p className="text-sm text-gray-600">
                        Creado: <ClientOnlyDateTime date={bucket.created_at} />
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No se encontraron buckets</p>
              )}
            </CardContent>
          </Card>

          {/* Archivos de Recipe Images */}
          <Card>
            <CardHeader>
              <CardTitle>Archivos en recipe-images</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo?.recipeImagesFiles && debugInfo.recipeImagesFiles.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.recipeImagesFiles.map((file, index) => (
                    <div key={index} className="border rounded p-3">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-600">Tamaño: {file.metadata?.size || "Desconocido"} bytes</p>
                      <p className="text-sm text-gray-600">
                        Modificado: <ClientOnlyDateTime date={file.updated_at} />
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No se encontraron archivos en recipe-images</p>
              )}
            </CardContent>
          </Card>

          {/* Archivos de Avatars */}
          <Card>
            <CardHeader>
              <CardTitle>Archivos en avatars</CardTitle>
            </CardHeader>
            <CardContent>
              {debugInfo?.avatarsFiles && debugInfo.avatarsFiles.length > 0 ? (
                <div className="space-y-2">
                  {debugInfo.avatarsFiles.map((file, index) => (
                    <div key={index} className="border rounded p-3">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-600">Tamaño: {file.metadata?.size || "Desconocido"} bytes</p>
                      <p className="text-sm text-gray-600">
                        Modificado: <ClientOnlyDateTime date={file.updated_at} />
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No se encontraron archivos en avatars</p>
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
