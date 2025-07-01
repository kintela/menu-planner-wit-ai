import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { rateLimiter } from "@/lib/supabase/rate-limiter"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.ip || "unknown"
    if (!rateLimiter.isAllowed(clientIP)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const { ingredients, preferences } = await request.json()

    if (!ingredients || ingredients.trim().length === 0) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 })
    }

    const prompt = `
Eres un chef experto. Basándote en los siguientes ingredientes: "${ingredients}"
${preferences ? `y las siguientes preferencias: "${preferences}"` : ""}

Sugiere 3 recetas diferentes. Para cada receta, proporciona:
1. Nombre de la receta
2. Lista de ingredientes (incluyendo cantidades aproximadas)
3. Instrucciones paso a paso
4. Tiempo de preparación estimado
5. Calorías aproximadas por porción

Formato la respuesta como JSON con esta estructura:
{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "ingredients": "Lista de ingredientes con cantidades",
      "instructions": "Instrucciones paso a paso",
      "prep_time": "Tiempo en minutos",
      "calories": número_de_calorías
    }
  ]
}
`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Try to parse the JSON response
    let suggestions
    try {
      suggestions = JSON.parse(text)
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      suggestions = {
        recipes: [
          {
            name: "Receta Sugerida",
            ingredients: ingredients,
            instructions: text,
            prep_time: "30 minutos",
            calories: 300,
          },
        ],
      }
    }

    return NextResponse.json(suggestions)
  } catch (error: any) {
    console.error("Error generating recipe suggestions:", error)

    // Check if it's an OpenAI API error
    if (error.message?.includes("API key")) {
      return NextResponse.json({ error: "AI service configuration error" }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
