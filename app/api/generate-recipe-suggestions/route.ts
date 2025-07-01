import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

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
    const prompt = `Genera 3 sugerencias de recetas basadas en:
    - Ingredientes: ${ingredients.join(", ")}
    - Preferencias: ${preferences || "ninguna especificada"}
    - Restricciones dietéticas: ${dietary_restrictions || "ninguna"}
    - Tipo de cocina: ${cuisine_type || "cualquiera"}
    
    Para cada receta, proporciona:
    1. Nombre de la receta
    2. Lista de ingredientes principales
    3. Breve descripción de la preparación
    4. Tiempo estimado de preparación
    5. Calorías aproximadas por porción
    
    Responde en formato JSON con un array de objetos con las propiedades: name, ingredients, preparation, prep_time, calories.`

    console.log("🚀 Enviando petición a OpenAI...")

    // Generar texto usando la nueva función
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      temperature: 0.7,
    })

    console.log("📡 Respuesta de OpenAI recibida")

    // Intentar parsear la respuesta como JSON
    let suggestions
    try {
      suggestions = JSON.parse(text)
      console.log("✅ Respuesta de OpenAI parseada exitosamente")
    } catch {
      // Si no es JSON válido, crear una respuesta estructurada
      suggestions = [
        {
          name: `Plato con ${ingredients.join(", ")}`,
          ingredients: ingredients,
          preparation: text.substring(0, 200) + "...",
          prep_time: 30,
          calories: 350,
        },
      ]
      console.error("❌ Error al parsear JSON, creando respuesta de fallback")
    }

    // Validar estructura
    if (!suggestions || !Array.isArray(suggestions)) {
      console.error("❌ Estructura de respuesta inválida:", suggestions)
      return NextResponse.json(
        {
          error: "Formato de respuesta de IA inválido",
          code: "INVALID_RESPONSE_FORMAT",
        },
        { status: 500 },
      )
    }

    // Validar cada receta
    const validSuggestions = suggestions.filter((suggestion) => {
      const isValid =
        suggestion &&
        typeof suggestion.name === "string" &&
        Array.isArray(suggestion.ingredients) &&
        typeof suggestion.preparation === "string" &&
        typeof suggestion.prep_time === "number" &&
        typeof suggestion.calories === "number" &&
        suggestion.name.trim() &&
        suggestion.ingredients.length > 0 &&
        suggestion.preparation.length > 0

      if (!isValid) {
        console.warn("⚠️ Sugerencia inválida filtrada:", suggestion)
      }

      return isValid
    })

    if (validSuggestions.length === 0) {
      console.error("❌ No se encontraron sugerencias válidas")
      return NextResponse.json(
        {
          error: "No se pudieron generar sugerencias válidas",
          code: "NO_VALID_SUGGESTIONS",
        },
        { status: 500 },
      )
    }

    const duration = Date.now() - startTime
    console.log(`✅ Proceso completado exitosamente en ${duration}ms`)
    console.log(`📊 Devolviendo ${validSuggestions.length} sugerencias válidas`)

    return NextResponse.json({
      suggestions: validSuggestions,
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
