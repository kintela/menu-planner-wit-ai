import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase/client"
import { RECIPE_IMAGES_BUCKET } from "@/lib/supabase/storage"

export async function POST(request: Request) {
  try {
    const { recipeName, ingredients } = await request.json()

    if (!recipeName?.trim()) {
      return NextResponse.json({ error: "Se requiere el nombre de la receta" }, { status: 400 })
    }

    // Verificar que la API key esté disponible
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "API key de OpenAI no configurada" }, { status: 500 })
    }

    // Crear un prompt más seguro para generar la imagen
    const imagePrompt = `A delicious ${recipeName.replace(/[^\w\s]/gi, "")} dish, professional food photography, appetizing presentation, high quality, realistic style`

    // Limitar la longitud del prompt
    const safePrompt = imagePrompt.length > 1000 ? imagePrompt.substring(0, 1000) : imagePrompt

    console.log("Generating image with prompt:", safePrompt)
    console.log("Using model: dall-e-3")

    // Generar imagen usando DALL-E
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: safePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    })

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json()
      console.error("Detailed OpenAI error:", {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        error: errorData,
      })

      // Return a more specific error message
      return NextResponse.json(
        {
          error: `Error generating image: ${errorData.error?.message || "Unknown OpenAI error"}`,
          details: errorData,
        },
        { status: 500 },
      )
    }

    const imageData = await imageResponse.json()
    const imageUrl = imageData.data[0]?.url

    if (!imageUrl) {
      throw new Error("No se pudo obtener la URL de la imagen generada")
    }

    // Descargar la imagen generada
    const downloadResponse = await fetch(imageUrl)
    if (!downloadResponse.ok) {
      throw new Error("Error al descargar la imagen generada")
    }

    const imageBuffer = await downloadResponse.arrayBuffer()
    const imageFile = new File([imageBuffer], `ai-recipe-${Date.now()}.png`, { type: "image/png" })

    // Subir la imagen a Supabase Storage
    const supabase = getSupabaseClient()
    const fileName = `ai-recipe-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
    const filePath = fileName

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Error uploading to Supabase:", uploadError)
      throw new Error("Error al subir imagen a Supabase")
    }

    // Obtener la URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(filePath)

    return NextResponse.json({
      imageUrl: publicUrl,
      message: "Imagen generada y subida exitosamente",
    })
  } catch (error) {
    console.error("Error generating recipe image:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
