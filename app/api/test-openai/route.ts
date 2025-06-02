import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          configured: false,
        },
        { status: 500 },
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Responde solo con 'OK' si puedes leer este mensaje.",
        },
      ],
      max_tokens: 10,
    })

    const response = completion.choices[0]?.message?.content

    return NextResponse.json({
      success: true,
      configured: true,
      response: response,
      model: "gpt-3.5-turbo",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("OpenAI test error:", error)
    return NextResponse.json(
      {
        error: "OpenAI API test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        configured: !!process.env.OPENAI_API_KEY,
      },
      { status: 500 },
    )
  }
}
