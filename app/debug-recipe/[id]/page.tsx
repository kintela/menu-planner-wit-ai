// Página de debug específica
import { createServerClient } from "@/lib/supabase/server"

export default async function DebugRecipePage({ params }: { params: { id: string } }) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    params,
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT_SET",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT_SET",
  }

  try {
    debugInfo.step1 = "Creando cliente Supabase"
    const supabase = createServerClient()

    debugInfo.step2 = "Cliente creado exitosamente"

    debugInfo.step3 = "Ejecutando consulta"
    const { data, error } = await supabase.from("recipes").select("*").eq("id", params.id).single()

    debugInfo.step4 = "Consulta completada"
    debugInfo.hasData = !!data
    debugInfo.hasError = !!error
    debugInfo.errorDetails = error

    if (data) {
      debugInfo.recipeData = {
        id: data.id,
        title: data.title,
        hasIngredients: !!data.ingredients,
        hasInstructions: !!data.instructions,
        ingredientsType: typeof data.ingredients,
        instructionsType: typeof data.instructions,
      }
    }
  } catch (error) {
    debugInfo.criticalError = {
      message: error instanceof Error ? error.message : "Error desconocido",
      stack: error instanceof Error ? error.stack : "No stack",
    }
  }

  return (
    <div className="p-4 font-mono text-xs">
      <h1 className="text-lg font-bold mb-4">Debug Info para Receta {params.id}</h1>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  )
}
