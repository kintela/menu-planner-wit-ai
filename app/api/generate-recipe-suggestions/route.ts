import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  try {
    const { searchQuery, mealType, dishOrder, dayName } = await request.json()

    if (!searchQuery?.trim()) {
      return NextResponse.json({ error: "Se requiere una búsqueda" }, { status: 400 })
    }

    // Verificar que la API key esté disponible
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "API key de OpenAI no configurada" }, { status: 500 })
    }

    const mealTypeText = mealType === "comida" ? "almuerzo" : "cena"
    const dishOrderText = dishOrder ? (dishOrder === 1 ? "primer plato" : "segundo plato") : ""
    const contextText = dishOrder ? `${dishOrderText} para ${mealTypeText}` : `plato para ${mealTypeText}`

    const prompt = `Genera exactamente 3 recetas diferentes para ${contextText} del ${dayName} basadas en: "${searchQuery}".

Para cada receta, proporciona:
1. Nombre del plato
2. Lista de ingredientes (uno por línea, con cantidades específicas)
3. Instrucciones de preparación (paso a paso, numeradas)
4. Breve descripción del plato (máximo 2 líneas)

Responde SOLO con este formato JSON válido:
{
  "recipes": [
    {
      "name": "Nombre del plato",
      "ingredients": "ingrediente 1\\ningrediente 2\\ningrediente 3",
      "preparation": "1. Paso uno\\n2. Paso dos\\n3. Paso tres",
      "description": "Descripción breve del plato"
    }
  ]
}

Asegúrate de que las recetas sean:
- Prácticas y realizables en casa
- Con ingredientes comunes y accesibles
- Apropiadas para ${contextText}
- Variadas entre sí
- Tiempo de preparación razonable (30-60 minutos)`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
    })

    // Intentar parsear la respuesta JSON
    let parsedResponse
    try {
      // Limpiar la respuesta para extraer solo el JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No se encontró JSON válido en la respuesta")
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      console.error("Raw response:", text)
      return NextResponse.json({ error: "Error al procesar la respuesta de la IA" }, { status: 500 })
    }

    if (parsedResponse?.recipes && Array.isArray(parsedResponse.recipes)) {
      const recipes = parsedResponse.recipes.slice(0, 3) // Asegurar máximo 3 recetas
      return NextResponse.json({ recipes })
    } else {
      return NextResponse.json({ error: "Formato de respuesta inválido" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
