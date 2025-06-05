import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export async function POST(request: Request) {
  console.log("=== Iniciando generación de sugerencias ===")

  try {
    // Verificar que tenemos el cuerpo de la petición
    let body
    try {
      body = await request.json()
      console.log("Cuerpo de la petición recibido:", body)
    } catch (error) {
      console.error("Error al parsear el cuerpo de la petición:", error)
      return NextResponse.json({ error: "Formato de petición inválido" }, { status: 400 })
    }

    const { searchQuery, mealType, dishOrder, dayName } = body

    // Validar parámetros requeridos
    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      console.error("searchQuery faltante o inválido:", searchQuery)
      return NextResponse.json({ error: "La búsqueda es requerida" }, { status: 400 })
    }

    // Verificar configuración de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY no configurada")
      return NextResponse.json({ error: "Configuración de IA no disponible" }, { status: 500 })
    }

    console.log("Inicializando cliente OpenAI...")
    let openai
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })
    } catch (error) {
      console.error("Error al inicializar OpenAI:", error)
      return NextResponse.json({ error: "Error de configuración de IA" }, { status: 500 })
    }

    // Verificar configuración de Supabase (opcional para obtener recetas existentes)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let existingTitles = ""
    if (supabaseUrl && supabaseServiceKey) {
      try {
        console.log("Obteniendo recetas existentes...")
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: existingRecipes } = await supabase.from("recipes").select("name").limit(30)

        if (existingRecipes && existingRecipes.length > 0) {
          existingTitles = existingRecipes.map((r) => r.name).join(", ")
          console.log(`Encontradas ${existingRecipes.length} recetas existentes`)
        }
      } catch (error) {
        console.warn("Error al obtener recetas existentes (continuando sin ellas):", error)
      }
    }

    // Preparar el prompt
    const mealTypeText = mealType === "comida" ? "almuerzo" : "cena"
    const dishOrderText = dishOrder === 1 ? "primer plato" : dishOrder === 2 ? "segundo plato" : "plato principal"

    const prompt = `Eres un chef experto. Crea exactamente 3 recetas basadas en esta búsqueda: "${searchQuery}"

Contexto:
- Tipo de comida: ${mealTypeText}
${dishOrder ? `- Tipo de plato: ${dishOrderText}` : ""}
- Día: ${dayName}
${existingTitles ? `- Evita nombres similares a: ${existingTitles.substring(0, 200)}` : ""}

Responde ÚNICAMENTE con este JSON (sin texto adicional):

{
  "recipes": [
    {
      "name": "Nombre corto y atractivo",
      "description": "Descripción breve de máximo 80 caracteres",
      "ingredients": "200g de ingrediente 1\\n1 taza de ingrediente 2\\n2 cucharadas de ingrediente 3",
      "preparation": "Paso 1: Descripción clara\\nPaso 2: Descripción clara\\nPaso 3: Descripción clara"
    },
    {
      "name": "Segundo plato",
      "description": "Otra descripción breve",
      "ingredients": "Ingredientes separados por \\n",
      "preparation": "Pasos separados por \\n"
    },
    {
      "name": "Tercer plato",
      "description": "Tercera descripción",
      "ingredients": "Más ingredientes con \\n",
      "preparation": "Más pasos con \\n"
    }
  ]
}

IMPORTANTE: Solo JSON válido, sin markdown, sin explicaciones.`

    console.log("Enviando petición a OpenAI...")

    let completion
    try {
      completion = await openai.chat.completions.create({
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
        max_tokens: 1200,
        timeout: 30000, // 30 segundos de timeout
      })
    } catch (error) {
      console.error("Error en la llamada a OpenAI:", error)

      if (error.message?.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "Límite de uso de IA alcanzado. Inténtalo en unos minutos.",
          },
          { status: 429 },
        )
      }

      if (error.message?.includes("timeout")) {
        return NextResponse.json(
          {
            error: "La IA tardó demasiado en responder. Inténtalo de nuevo.",
          },
          { status: 408 },
        )
      }

      return NextResponse.json(
        {
          error: "Error al comunicarse con la IA. Inténtalo de nuevo.",
        },
        { status: 500 },
      )
    }

    const response = completion.choices[0]?.message?.content
    console.log("Respuesta de OpenAI recibida, longitud:", response?.length || 0)

    if (!response) {
      console.error("OpenAI devolvió respuesta vacía")
      return NextResponse.json({ error: "La IA no pudo generar sugerencias" }, { status: 500 })
    }

    // Limpiar y parsear la respuesta
    let cleanedResponse = response.trim()

    // Remover markdown si existe
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    console.log("Respuesta limpia (primeros 200 chars):", cleanedResponse.substring(0, 200))

    let suggestionsData
    try {
      suggestionsData = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError)
      console.error("Respuesta completa:", cleanedResponse)

      // Intentar crear una respuesta de fallback
      return NextResponse.json({
        recipes: [
          {
            name: `Plato con ${searchQuery}`,
            description: "Receta deliciosa y fácil de preparar",
            ingredients: `Ingrediente principal: ${searchQuery}\nAceite de oliva\nSal y pimienta\nAjo`,
            preparation: "Paso 1: Preparar los ingredientes\nPaso 2: Cocinar a fuego medio\nPaso 3: Servir caliente",
          },
        ],
      })
    }

    // Validar estructura
    if (!suggestionsData.recipes || !Array.isArray(suggestionsData.recipes)) {
      console.error("Estructura de respuesta inválida:", suggestionsData)
      return NextResponse.json({ error: "Formato de respuesta de IA inválido" }, { status: 500 })
    }

    // Validar cada receta
    const validRecipes = suggestionsData.recipes.filter((recipe) => {
      return (
        recipe &&
        typeof recipe.name === "string" &&
        typeof recipe.description === "string" &&
        typeof recipe.ingredients === "string" &&
        typeof recipe.preparation === "string" &&
        recipe.name.trim() &&
        recipe.ingredients.trim() &&
        recipe.preparation.trim()
      )
    })

    if (validRecipes.length === 0) {
      console.error("No se encontraron recetas válidas")
      return NextResponse.json({ error: "No se pudieron generar recetas válidas" }, { status: 500 })
    }

    console.log(`Devolviendo ${validRecipes.length} recetas válidas`)
    return NextResponse.json({ recipes: validRecipes })
  } catch (error) {
    console.error("Error general en la API:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: "No se pudieron generar las sugerencias. Inténtalo de nuevo.",
      },
      { status: 500 },
    )
  }
}
