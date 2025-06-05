import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { searchQuery, mealType, dishOrder, dayName } = await request.json()

    console.log("Received request:", { searchQuery, mealType, dishOrder, dayName })

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    if (!searchQuery || !searchQuery.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase not configured")
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener recetas existentes para evitar duplicados
    let existingTitles = ""
    try {
      const { data: existingRecipes, error: recipesError } = await supabase.from("recipes").select("name").limit(50)

      if (recipesError) {
        console.error("Error fetching existing recipes:", recipesError)
      } else if (existingRecipes && existingRecipes.length > 0) {
        existingTitles = existingRecipes.map((r) => r.name).join(", ")
      }
    } catch (error) {
      console.error("Error querying existing recipes:", error)
      // Continue without existing recipes check
    }

    const mealTypeText = mealType === "comida" ? "almuerzo" : "cena"
    const dishOrderText = dishOrder === 1 ? "primer plato" : dishOrder === 2 ? "segundo plato" : "plato principal"

    const prompt = `
Sugiere 3 recetas únicas y creativas basadas en:

Búsqueda del usuario: ${searchQuery}
Tipo de comida: ${mealTypeText}
${dishOrder ? `Tipo de plato: ${dishOrderText}` : ""}
Día de la semana: ${dayName}

${existingTitles ? `Evita estas recetas que ya existen: ${existingTitles}` : ""}

Responde SOLO con un JSON válido en este formato exacto:
{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "description": "Descripción breve y atractiva de máximo 100 caracteres",
      "ingredients": "Ingrediente 1\nIngrediente 2\nIngrediente 3\n...",
      "preparation": "Paso 1: Descripción del paso\nPaso 2: Descripción del paso\nPaso 3: Descripción del paso\n..."
    }
  ]
}

Requisitos importantes:
- El JSON debe ser válido y parseable
- Cada receta debe tener exactamente los 4 campos: name, description, ingredients, preparation
- Los ingredientes deben estar separados por saltos de línea (\n)
- Los pasos de preparación deben estar separados por saltos de línea (\n)
- Las recetas deben ser factibles con ingredientes comunes
- Incluye cantidades aproximadas en los ingredientes
- Los pasos deben ser claros y concisos
- Nombres únicos y creativos
`

    console.log("Sending request to OpenAI...")

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres un chef experto que sugiere recetas creativas. Respondes SOLO con JSON válido, sin texto adicional antes o después del JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    })

    const response = completion.choices[0]?.message?.content

    console.log("OpenAI response received:", response?.substring(0, 200) + "...")

    if (!response) {
      console.error("No response from OpenAI")
      return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 })
    }

    try {
      // Clean the response to ensure it's valid JSON
      let cleanedResponse = response.trim()

      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/, "").replace(/\s*```$/, "")
      } else if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/```\s*/, "").replace(/\s*```$/, "")
      }

      console.log("Cleaned response:", cleanedResponse.substring(0, 200) + "...")

      const suggestionsData = JSON.parse(cleanedResponse)

      // Validate the response structure
      if (!suggestionsData.recipes || !Array.isArray(suggestionsData.recipes)) {
        throw new Error("Invalid response structure: missing recipes array")
      }

      // Validate each recipe has required fields
      for (const recipe of suggestionsData.recipes) {
        if (!recipe.name || !recipe.description || !recipe.ingredients || !recipe.preparation) {
          throw new Error("Invalid recipe structure: missing required fields")
        }
      }

      console.log("Successfully parsed and validated response")
      return NextResponse.json(suggestionsData)
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError)
      console.error("Raw response:", response)

      // Return a fallback response
      return NextResponse.json(
        {
          error: "Error al procesar la respuesta de IA",
          details: "La IA devolvió una respuesta en formato incorrecto. Por favor, inténtalo de nuevo.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error generating recipe suggestions:", error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json({ error: "Error de configuración de IA" }, { status: 500 })
      } else if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Límite de uso de IA alcanzado. Inténtalo en unos minutos." },
          { status: 429 },
        )
      } else if (error.message.includes("network")) {
        return NextResponse.json({ error: "Error de conexión. Verifica tu conexión a internet." }, { status: 503 })
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: "No se pudieron generar las sugerencias. Por favor, inténtalo de nuevo.",
      },
      { status: 500 },
    )
  }
}
