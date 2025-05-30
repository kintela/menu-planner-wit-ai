import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  console.log("=== TEST DB UPDATE API ===")

  try {
    const { recipeId, imageUrl } = await request.json()

    console.log("Recipe ID:", recipeId)
    console.log("Image URL to save:", imageUrl)

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("Environment variables:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
    })

    // Probar con cliente anónimo primero
    console.log("--- Testing with anon client ---")
    const anonClient = createClient(supabaseUrl!, supabaseAnonKey!)

    const { data: anonData, error: anonError } = await anonClient
      .from("recipes")
      .update({ image_url: imageUrl })
      .eq("id", recipeId)
      .select()

    console.log("Anon client result:", { data: anonData, error: anonError })

    // Probar con cliente de servicio
    console.log("--- Testing with service client ---")
    const serviceClient = createClient(supabaseUrl!, supabaseServiceKey!)

    const { data: serviceData, error: serviceError } = await serviceClient
      .from("recipes")
      .update({ image_url: imageUrl })
      .eq("id", recipeId)
      .select()

    console.log("Service client result:", { data: serviceData, error: serviceError })

    // Verificar el estado actual de la receta
    console.log("--- Checking current recipe state ---")
    const { data: currentRecipe, error: fetchError } = await serviceClient
      .from("recipes")
      .select("id, name, image_url")
      .eq("id", recipeId)
      .single()

    console.log("Current recipe:", { data: currentRecipe, error: fetchError })

    return NextResponse.json({
      success: true,
      anonResult: { data: anonData, error: anonError },
      serviceResult: { data: serviceData, error: serviceError },
      currentRecipe: { data: currentRecipe, error: fetchError },
    })
  } catch (error) {
    console.error("Test DB update error:", error)
    return NextResponse.json(
      { error: "Error en test", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
