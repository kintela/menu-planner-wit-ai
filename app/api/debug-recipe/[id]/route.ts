import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    console.log("🔍 Debug Recipe API iniciado para ID:", id)

    const supabase = createServerClient()

    // Test específico para la receta solicitada
    const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).single()

    console.log("🔍 Resultado:", {
      hasData: !!recipe,
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
    })

    return NextResponse.json({
      success: !error,
      recipeId: id,
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
      recipeId: id,
      timestamp: new Date().toISOString(),
    })

  }
}
