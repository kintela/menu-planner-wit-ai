import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { ingredients, preferences } = await request.json()

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: "Se requieren ingredientes" }, { status: 400 })
    }

    const prompt = `
      Basándote en los siguientes ingredientes: ${ingredients.join(", ")}
      ${preferences ? `Y considerando estas preferencias: ${preferences}` : ""}
      
      Genera 3 sugerencias de recetas en español. Para cada receta incluye:
      - Nombre de la receta
      - Lista de ingredientes necesarios
      - Pasos de preparación
      - Tiempo aproximado de cocción
      - Nivel de dificultad (Fácil/Medio/Difícil)
      
      Formato la respuesta como JSON con esta estructura:
      {
        "recipes": [
          {
            "name": "Nombre de la receta",
            "ingredients": ["ingrediente1", "ingrediente2"],
            "instructions": ["paso1", "paso2"],
            "cookingTime": "30 minutos",
            "difficulty": "Fácil"
          }
        ]
      }
    `

    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt,
      temperature: 0.7,
    })

    // Intentar parsear la respuesta como JSON
    let suggestions
    try {
      suggestions = JSON.parse(text)
    } catch (parseError) {
      // Si no se puede parsear, crear una estructura básica
      suggestions = {
        recipes: [
          {
            name: "Receta sugerida",
            ingredients: ingredients,
            instructions: ["Preparar con los ingredientes disponibles"],
            cookingTime: "30 minutos",
            difficulty: "Fácil",
          },
        ],
      }
    }

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generando sugerencias:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
