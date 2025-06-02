import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("🔍 Debug Recipe API iniciado para ID:", params.id)

    const supabase = createServerClient()

    // Test específico para la receta solicitada
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    console.log("🔍 Resultado:", {
      hasData: !!recipe,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
    })

    return NextResponse.json({
      success: !error,
      recipeId: params.id,
      found: !!recipe,
      data: recipe,
      error: error ? { message: error.message, code: error.code } : null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Error crítico en debug recipe:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      recipeId: params.id,
      timestamp: new Date().toISOString(),
    })

  }
}
