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

    // Test 3: Test de conectividad a Supabase (mejorado)
    try {
      const response = await fetch("/api/test-supabase")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
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

    // Test 4: Test directo de fetch a receta
    try {
      const response = await fetch("/recipes/89", {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      })

      results.push({
        test: "Fetch directo a /recipes/89",
        result: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          contentType: response.headers.get("content-type"),
        },
      })
    } catch (error) {
      results.push({
        test: "Fetch directo a /recipes/89",
        result: { error: error instanceof Error ? error.message : "Error desconocido" },
      })
    }

    // Test 5: Test de autenticación
    try {
      const response = await fetch("/api/auth/session")
      if (response.ok) {
        const sessionData = await response.json()
        results.push({
          test: "Estado de autenticación",
          result: {
            authenticated: !!sessionData?.user,
            userId: sessionData?.user?.id || null,
            email: sessionData?.user?.email || null,
          },
        })
      } else {
        results.push({
          test: "Estado de autenticación",
          result: { error: "No se pudo verificar la sesión" },
        })
      }
    } catch (error) {
      results.push({
        test: "Estado de autenticación",
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
      <h1 className="text-2xl font-bold mb-6">Diagnóstico Móvil - Mejorado</h1>

      <div className="mb-6 space-x-4">
        <Button onClick={runTests} disabled={isLoading}>
          {isLoading ? "Ejecutando tests..." : "Ejecutar tests"}
        </Button>

        <Button asChild variant="outline">
          <Link href="/recipes">Volver a recetas</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/recipes/89">Probar receta 89</Link>
        </Button>
      </div>

      <div className="space-y-6">
        {tests.map((test, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">{test.test}</h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(test.result, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Información importante:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>El test de Supabase ahora muestra la estructura real de la tabla</li>
          <li>Verifica qué columnas están disponibles en tu tabla recipes</li>
          <li>El test de receta 89 te dirá si existe esa receta específica</li>
          <li>Comparte todos estos resultados para diagnosticar el problema</li>
        </ul>
      </div>

    </div>
  )
}
