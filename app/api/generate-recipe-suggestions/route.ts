import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { ingredients, preferences, count = 3 } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener recetas existentes para evitar duplicados
    const { data: existingRecipes, error: recipesError } = await supabase.from("recipes").select("title").limit(100)

    if (recipesError) {
      console.error("Error fetching existing recipes:", recipesError)
    }

    const existingTitles = existingRecipes ? existingRecipes.map((r) => r.title).join(", ") : ""

    const prompt = `
Sugiere ${count} recetas únicas y creativas basadas en:

Ingredientes disponibles: ${ingredients}
Preferencias: ${preferences}

${existingTitles ? `Evita estas recetas que ya existen: ${existingTitles}` : ""}

Responde SOLO con un JSON válido en este formato:
{
  "suggestions": [
    {
      "title": "Nombre de la receta",
      "description": "Descripción breve y atractiva",
      "difficulty": "easy|medium|hard",
      "prep_time": 15,
      "cook_time": 30,
      "category": "Categoría de la receta"
    }
  ]
}

Asegúrate de que:
- El JSON sea válido
- Las recetas sean factibles con los ingredientes dados
- Sean variadas y atractivas
- Incluyan tiempos realistas
- Tengan nombres únicos y creativos
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres un chef experto que sugiere recetas creativas. Respondes SOLO con JSON válido, sin texto adicional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 })
    }

    try {
      const suggestionsData = JSON.parse(response)
      return NextResponse.json(suggestionsData)
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError)
      console.error("Raw response:", response)
      return NextResponse.json({ error: "Invalid response format from AI" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error generating recipe suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
