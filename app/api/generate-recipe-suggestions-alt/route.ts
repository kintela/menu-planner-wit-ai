import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  console.log("=== Iniciando generación de sugerencias (versión alternativa) ===")

  try {
    const body = await request.json()
    const { searchQuery, mealType, dishOrder, dayName } = body

    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json({ error: "La búsqueda es requerida" }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Configuración de IA no disponible" }, { status: 500 })
    }

    // Obtener recetas existentes
    let existingTitles = ""
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: existingRecipes } = await supabase.from("recipes").select("name").limit(30)
        if (existingRecipes && existingRecipes.length > 0) {
          existingTitles = existingRecipes.map((r) => r.name).join(", ")
        }
      } catch (error) {
        console.warn("Error al obtener recetas existentes:", error)
      }
    }

    const mealTypeText = mealType === "comida" ? "almuerzo" : "cena"
    const dishOrderText = dishOrder === 1 ? "primer plato" : dishOrder === 2 ? "segundo plato" : "plato principal"

    const prompt = `Eres un chef experto. Crea exactamente 3 recetas basadas en: "${searchQuery}"

Contexto:
- Tipo: ${mealTypeText}
${dishOrder ? `- Plato: ${dishOrderText}` : ""}
- Día: ${dayName}

Responde SOLO con JSON válido:

{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "description": "Descripción breve",
      "ingredients": "Ingrediente 1\\nIngrediente 2\\nIngrediente 3",
      "preparation": "Paso 1\\nPaso 2\\nPaso 3"
    }
  ]
}

Sin markdown, solo JSON.`

    // Usar fetch directo para llamar a OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Eres un chef que responde SOLO con JSON válido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error de OpenAI:", response.status, errorText)
      return NextResponse.json({ error: "Error al comunicarse con la IA" }, { status: 500 })
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    if (!aiResponse) {
      return NextResponse.json({ error: "La IA no pudo generar sugerencias" }, { status: 500 })
    }

    // Limpiar y parsear respuesta
    let cleanedResponse = aiResponse.trim()
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    }

    try {
      const suggestionsData = JSON.parse(cleanedResponse)

      if (!suggestionsData.recipes || !Array.isArray(suggestionsData.recipes)) {
        throw new Error("Estructura inválida")
      }

      return NextResponse.json(suggestionsData)
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError)

      // Respuesta de fallback
      return NextResponse.json({
        recipes: [
          {
            name: `Plato con ${searchQuery}`,
            description: "Receta deliciosa y fácil de preparar",
            ingredients: `${searchQuery}\nAceite de oliva\nSal y pimienta`,
            preparation: "Paso 1: Preparar ingredientes\nPaso 2: Cocinar\nPaso 3: Servir",
          },
        ],
      })
    }
  } catch (error) {
    console.error("Error general:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
