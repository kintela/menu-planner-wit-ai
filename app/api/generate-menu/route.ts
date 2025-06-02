import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { preferences, days = 7 } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener recetas existentes para usar como referencia
    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select("title, category, tags, difficulty")
      .limit(50)

    if (recipesError) {
      console.error("Error fetching recipes:", recipesError)
    }

    const recipesContext = recipes ? recipes.map((r) => `${r.title} (${r.category}, ${r.difficulty})`).join(", ") : ""

    const prompt = `
Genera un menú semanal de ${days} días basado en las siguientes preferencias:
${preferences}

${recipesContext ? `Recetas disponibles en la base de datos: ${recipesContext}` : ""}

Responde SOLO con un JSON válido en este formato:
{
  "menu": [
    {
      "day": "Lunes",
      "breakfast": "Nombre del desayuno",
      "lunch": "Nombre del almuerzo", 
      "dinner": "Nombre de la cena"
    }
  ]
}

Asegúrate de que:
- El JSON sea válido
- Incluya ${days} días
- Las comidas sean variadas y equilibradas
- Considere las preferencias mencionadas
- Use nombres de platos específicos y atractivos
`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres un chef experto en planificación de menús. Respondes SOLO con JSON válido, sin texto adicional.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 })
    }

    try {
      const menuData = JSON.parse(response)
      return NextResponse.json(menuData)
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError)
      console.error("Raw response:", response)
      return NextResponse.json({ error: "Invalid response format from AI" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error generating menu:", error)
    return NextResponse.json({ error: "Failed to generate menu" }, { status: 500 })
  }
}
