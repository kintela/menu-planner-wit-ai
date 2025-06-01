import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔍 Test Supabase API iniciado")

    const supabase = createServerClient()

    // Test 1: Verificar estructura de la tabla recipes
    const { data: tableInfo, error: tableError } = await supabase.from("recipes").select("*").limit(1)

    if (tableError) {
      console.error("❌ Error al acceder a tabla recipes:", tableError)
      return NextResponse.json({
        success: false,
        error: tableError.message,
        code: tableError.code,
        step: "table_access",
      })
    }

    // Test 2: Obtener información de las columnas disponibles
    let availableColumns = []
    if (tableInfo && tableInfo.length > 0) {
      availableColumns = Object.keys(tableInfo[0])
    }

    // Test 3: Intentar obtener una receta específica (ID 89)
    const { data: recipe89, error: recipe89Error } = await supabase.from("recipes").select("*").eq("id", 89).single()

    console.log("✅ Test Supabase completado")
    return NextResponse.json({
      success: true,
      message: "Conexión a Supabase exitosa",
      tableStructure: {
        totalRecords: tableInfo?.length || 0,
        availableColumns: availableColumns,
        sampleRecord: tableInfo?.[0] || null,
      },
      recipe89Test: {
        found: !recipe89Error,
        data: recipe89,
        error: recipe89Error?.message || null,
      },
    })
  } catch (error) {
    console.error("❌ Error crítico en test Supabase:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
      step: "critical_error",
    })
  }
}
