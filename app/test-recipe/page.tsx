import { createServerClient } from "@/lib/supabase/server"

export default async function TestRecipePage() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "CONFIGURADO" : "NO_CONFIGURADO",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "CONFIGURADO" : "NO_CONFIGURADO",
  }

  try {
    debugInfo.paso1 = "Intentando crear cliente Supabase..."
    const supabase = createServerClient()
    debugInfo.paso2 = "Cliente Supabase creado exitosamente"

    debugInfo.paso3 = "Probando consulta simple..."
    const { data: recipes, error } = await supabase.from("recipes").select("id, title").limit(5)

    debugInfo.paso4 = "Consulta completada"
    debugInfo.totalRecetas = recipes?.length || 0
    debugInfo.primerasRecetas = recipes?.map((r) => ({ id: r.id, title: r.title })) || []
    debugInfo.errorConsulta = error?.message || null

    if (recipes && recipes.length > 0) {
      debugInfo.paso5 = "Probando consulta específica de receta..."
      const primeraReceta = recipes[0]
      const { data: recetaCompleta, error: errorReceta } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", primeraReceta.id)
        .single()

      debugInfo.recetaCompleta = {
        encontrada: !!recetaCompleta,
        error: errorReceta?.message || null,
        titulo: recetaCompleta?.title || null,
        tieneIngredientes: !!recetaCompleta?.ingredients,
        tieneInstrucciones: !!recetaCompleta?.instructions,
      }
    }
  } catch (error) {
    debugInfo.errorCritico = {
      mensaje: error instanceof Error ? error.message : "Error desconocido",
      tipo: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : null,
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test de Conexión a Base de Datos</h1>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h2 className="font-bold mb-2">Información de Debug:</h2>
        <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div className="mt-4">
        <a href="/recipes" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Volver a Recetas
        </a>
      </div>
    </div>
  )
}
