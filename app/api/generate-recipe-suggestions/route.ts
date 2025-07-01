import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

// Configuración específica para producción
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// Función helper para hacer retry de requests
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt}/${maxRetries} de llamada a OpenAI`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos por intento

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        console.log(`Éxito en intento ${attempt}`)
        return response
      }

      // Si es un error 4xx, no reintentar
      if (response.status >= 400 && response.status < 500) {
        console.log(`Error ${response.status}, no reintentando`)
        return response
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`Intento ${attempt} falló:`, lastError.message)

      if (attempt < maxRetries) {
        const delay = attempt * 2000 // 2s, 4s
        console.log(`Esperando ${delay}ms antes del siguiente intento...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError!
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("=== Iniciando generación de sugerencias ===", new Date().toISOString())

  try {
    // Verificar configuración crítica primero
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY no configurada")
      return NextResponse.json(
        {
          error: "Configuración de IA no disponible",
          code: "MISSING_API_KEY",
        },
        { status: 500 },
      )
    }

    console.log("✅ OpenAI API Key configurada, longitud:", process.env.OPENAI_API_KEY.length)

    // Verificar que tenemos el cuerpo de la petición
    let body
    try {
      body = await request.json()
      console.log("✅ Cuerpo de la petición recibido:", {
        ingredients: body.ingredients?.join(", "),
        preferences: body.preferences,
        dietary_restrictions: body.dietary_restrictions,
        cuisine_type: body.cuisine_type,
      })
    } catch (error) {
      console.error("❌ Error al parsear el cuerpo de la petición:", error)
      return NextResponse.json(
        {
          error: "Formato de petición inválido",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 },
      )
    }

    const { ingredients, preferences, dietary_restrictions, cuisine_type } = body

    // Validar parámetros requeridos
    if (!ingredients || ingredients.length === 0) {
      console.error("❌ ingredients faltantes o inválidos:", ingredients)
      return NextResponse.json(
        {
          error: "Se requieren ingredientes",
          code: "MISSING_INGREDIENTS",
        },
        { status: 400 },
      )
    }

    // Obtener recetas existentes (opcional)
    let existingTitles = ""
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      try {
        console.log("🔍 Obteniendo recetas existentes...")
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: existingRecipes, error } = await supabase.from("recipes").select("name").limit(30)

        if (error) {
          console.warn("⚠️ Error al obtener recetas existentes:", error.message)
        } else if (existingRecipes && existingRecipes.length > 0) {
          existingTitles = existingRecipes.map((r) => r.name).join(", ")
          console.log(`✅ Encontradas ${existingRecipes.length} recetas existentes`)
        }
      } catch (error) {
        console.warn("⚠️ Error al conectar con Supabase (continuando sin recetas existentes):", error)
      }
    }

    // Preparar el prompt
    const prompt = `
Genera 3 sugerencias de recetas basadas en:
- Ingredientes: ${ingredients.join(", ")}
- Preferencias: ${preferences || "ninguna especificada"}
- Restricciones dietéticas: ${dietary_restrictions || "ninguna"}
- Tipo de cocina: ${cuisine_type || "cualquiera"}

Para cada receta, proporciona:
1. Nombre de la receta
2. Lista de ingredientes
3. Instrucciones paso a paso
4. Tiempo de preparación estimado
5. Número de porciones
6. Calorías aproximadas por porción

Responde en formato JSON con un array de objetos "recipes".`

    console.log("🚀 Enviando petición a OpenAI...")

    // Preparar opciones de fetch
    const fetchOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "User-Agent": "MenuPlanner/1.0",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Eres un chef que responde SOLO con JSON válido. No uses markdown ni texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    }

    // Hacer la llamada con retry
    let openaiResponse: Response
    try {
      openaiResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", fetchOptions, 3)
    } catch (error) {
      console.error("❌ Error en todas las llamadas a OpenAI:", error)

      return NextResponse.json(
        {
          error: "No se pudo conectar con el servicio de IA. Verifica tu conexión e inténtalo de nuevo.",
          code: "OPENAI_CONNECTION_FAILED",
          details: error instanceof Error ? error.message : "Error de conexión",
          duration: Date.now() - startTime,
        },
        { status: 503 },
      )
    }

    console.log("📡 Respuesta de OpenAI recibida, status:", openaiResponse.status)

    if (!openaiResponse.ok) {
      let errorDetails = `HTTP ${openaiResponse.status}: ${openaiResponse.statusText}`

      try {
        const errorData = await openaiResponse.json()
        errorDetails = errorData.error?.message || errorDetails
        console.error("❌ Error detallado de OpenAI:", errorData)
      } catch {
        console.error("❌ No se pudo parsear error de OpenAI")
      }

      if (openaiResponse.status === 429) {
        return NextResponse.json(
          {
            error: "Límite de uso de IA alcanzado. Inténtalo en unos minutos.",
            code: "RATE_LIMITED",
          },
          { status: 429 },
        )
      }

      if (openaiResponse.status === 401) {
        return NextResponse.json(
          {
            error: "Error de autenticación con la IA.",
            code: "UNAUTHORIZED",
          },
          { status: 500 },
        )
      }

      if (openaiResponse.status >= 500) {
        return NextResponse.json(
          {
            error: "El servicio de IA está temporalmente no disponible. Inténtalo en unos minutos.",
            code: "SERVICE_UNAVAILABLE",
            details: errorDetails,
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          error: "Error al comunicarse con la IA.",
          code: "OPENAI_ERROR",
          details: errorDetails,
        },
        { status: 500 },
      )
    }

    // Parsear respuesta
    let openaiData
    try {
      openaiData = await openaiResponse.json()
      console.log("✅ Respuesta de OpenAI parseada exitosamente")
    } catch (error) {
      console.error("❌ Error al parsear respuesta de OpenAI:", error)
      return NextResponse.json(
        {
          error: "Error al procesar respuesta de la IA.",
          code: "RESPONSE_PARSE_ERROR",
        },
        { status: 500 },
      )
    }

    const response = openaiData.choices?.[0]?.message?.content
    console.log("📝 Contenido de respuesta recibido, longitud:", response?.length || 0)

    if (!response) {
      console.error("❌ OpenAI devolvió respuesta vacía")
      return NextResponse.json(
        {
          error: "La IA no pudo generar sugerencias",
          code: "EMPTY_RESPONSE",
        },
        { status: 500 },
      )
    }

    // Limpiar y parsear la respuesta
    let cleanedResponse = response.trim()

    // Remover markdown si existe
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    console.log("🧹 Respuesta limpia (primeros 200 chars):", cleanedResponse.substring(0, 200))

    let suggestionsData
    try {
      suggestionsData = JSON.parse(cleanedResponse)
      console.log("✅ JSON parseado exitosamente")
    } catch (parseError) {
      console.error("❌ Error al parsear JSON:", parseError)
      console.error("Respuesta completa:", cleanedResponse)

      // Crear respuesta de fallback
      console.log("🔄 Creando respuesta de fallback...")
      return NextResponse.json({
        recipes: [
          {
            name: `Plato con ${ingredients.join(", ")}`,
            ingredients: ingredients,
            instructions: ["Preparar según las instrucciones generadas por IA"],
            prep_time: 30,
            servings: 4,
            calories: 300,
          },
        ],
        fallback: true,
        duration: Date.now() - startTime,
      })
    }

    // Validar estructura
    if (!suggestionsData.recipes || !Array.isArray(suggestionsData.recipes)) {
      console.error("❌ Estructura de respuesta inválida:", suggestionsData)
      return NextResponse.json(
        {
          error: "Formato de respuesta de IA inválido",
          code: "INVALID_RESPONSE_FORMAT",
        },
        { status: 500 },
      )
    }

    // Validar cada receta
    const validRecipes = suggestionsData.recipes.filter((recipe) => {
      const isValid =
        recipe &&
        typeof recipe.name === "string" &&
        Array.isArray(recipe.ingredients) &&
        Array.isArray(recipe.instructions) &&
        typeof recipe.prep_time === "number" &&
        typeof recipe.servings === "number" &&
        typeof recipe.calories === "number" &&
        recipe.name.trim() &&
        recipe.ingredients.length > 0 &&
        recipe.instructions.length > 0

      if (!isValid) {
        console.warn("⚠️ Receta inválida filtrada:", recipe)
      }

      return isValid
    })

    if (validRecipes.length === 0) {
      console.error("❌ No se encontraron recetas válidas")
      return NextResponse.json(
        {
          error: "No se pudieron generar recetas válidas",
          code: "NO_VALID_RECIPES",
        },
        { status: 500 },
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ Proceso completado exitosamente en ${duration}ms`)
    console.log(`📊 Devolviendo ${validRecipes.length} recetas válidas`)

    return NextResponse.json({
      recipes: validRecipes,
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error("💥 Error general en la API:", error)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Error desconocido",
        duration,
      },
      { status: 500 },
    )
  }
}
