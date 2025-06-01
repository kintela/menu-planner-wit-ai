import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔍 Test Supabase API iniciado")

    const supabase = createServerClient()

    // Test básico de conectividad
    const { data, error } = await supabase.from("recipes").select("id, title").limit(1)

    if (error) {
      console.error("❌ Error en test Supabase:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
      })
    }

    console.log("✅ Test Supabase exitoso")
    return NextResponse.json({
      success: true,
      message: "Conexión a Supabase exitosa",
      sampleData: data,
    })
  } catch (error) {
    console.error("❌ Error crítico en test Supabase:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    })
  }
}
