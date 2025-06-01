"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DebugMobilePage() {
  const [tests, setTests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const runTests = async () => {
    setIsLoading(true)
    const results = []

    // Test 1: Información del dispositivo
    results.push({
      test: "Información del dispositivo",
      result: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${screen.width}x${screen.height}`,
      },
    })

    // Test 2: Variables de entorno (lado cliente)
    results.push({
      test: "Variables de entorno (cliente)",
      result: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "NO DEFINIDA",
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
    })

    // Test 3: Test de conectividad a Supabase
    try {
      const response = await fetch("/api/test-supabase")
      const data = await response.json()
      results.push({
        test: "Conectividad Supabase",
        result: data,
      })
    } catch (error) {
      results.push({
        test: "Conectividad Supabase",
        result: { error: error instanceof Error ? error.message : "Error desconocido" },
      })
    }

    // Test 4: Test de receta específica
    try {
      const response = await fetch("/api/recipes/89")
      const data = await response.json()
      results.push({
        test: "API Receta 89",
        result: { status: response.status, data },
      })
    } catch (error) {
      results.push({
        test: "API Receta 89",
        result: { error: error instanceof Error ? error.message : "Error desconocido" },
      })
    }

    // Test 5: Test de navegación directa
    try {
      const response = await fetch("/recipes/89", { method: "HEAD" })
      results.push({
        test: "Navegación a /recipes/89",
        result: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        },
      })
    } catch (error) {
      results.push({
        test: "Navegación a /recipes/89",
        result: { error: error instanceof Error ? error.message : "Error desconocido" },
      })
    }

    setTests(results)
    setIsLoading(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Diagnóstico Móvil</h1>

      <div className="mb-6 space-x-4">
        <Button onClick={runTests} disabled={isLoading}>
          {isLoading ? "Ejecutando tests..." : "Ejecutar tests"}
        </Button>

        <Button asChild variant="outline">
          <Link href="/recipes">Volver a recetas</Link>
        </Button>
      </div>

      <div className="space-y-6">
        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{test.test}</h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">{JSON.stringify(test.result, null, 2)}</pre>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Instrucciones:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Ejecuta estos tests desde móvil</li>
          <li>Copia los resultados y compártelos</li>
          <li>Intenta acceder a /recipes/89 después de estos tests</li>
          <li>Si sigue fallando, limpia caché del navegador</li>
        </ol>
      </div>
    </div>
  )
}
