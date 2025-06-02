import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { recipeName, description } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    if (!recipeName) {
      return NextResponse.json({ error: "Recipe name is required" }, { status: 400 })
    }

    const prompt = `A professional, appetizing photo of ${recipeName}. ${
      description ? `The dish is: ${description}.` : ""
    } High quality food photography, well-lit, restaurant-style presentation, clean background, vibrant colors, appetizing appearance.`

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    })

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 })
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("Error generating recipe image:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
