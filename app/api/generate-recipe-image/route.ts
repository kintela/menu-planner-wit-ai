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


    // Crear un prompt muy simple y seguro
    const cleanRecipeName = recipeName
      .replace(/[^\w\s]/gi, "") // Remove special characters
      .replace(/\b(alcohol|wine|beer|liquor)\b/gi, "") // Remove alcohol-related words
      .trim()

    // Usar un prompt muy básico y genérico
    const imagePrompt = `A plate of food, restaurant style, appetizing, professional food photography`

    console.log("Generating image with safe prompt:", imagePrompt)

    // Generar imagen usando DALL-E con configuración más conservadora

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    })


    const responseText = await imageResponse.text()
    console.log("OpenAI Response Status:", imageResponse.status)
    console.log("OpenAI Response:", responseText)

    if (!imageResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { error: { message: responseText } }
      }

      console.error("OpenAI API Error Details:", {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        headers: Object.fromEntries(imageResponse.headers.entries()),
        body: errorData,
      })

      // Return a more informative error
      return NextResponse.json(
        {
          error: "Image generation temporarily unavailable",
          details: errorData.error?.message || "OpenAI service error",
          suggestion: "Recipe will be created without image",
        },
        { status: 503 }, // Service unavailable instead of 500
      )
    }

    const imageData = JSON.parse(responseText)

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

        suggestion: "Recipe will be created without image",

      },
      { status: 500 },
    )
  }
}
