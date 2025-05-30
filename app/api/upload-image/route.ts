import { NextResponse } from "next/server"
import { uploadRecipeImage, initializeStorage } from "@/lib/supabase/storage"

export async function POST(request: Request) {
  console.log("=== UPLOAD IMAGE API CALLED ===")
  try {
    // Obtener el ID de la receta de los parámetros de consulta
    const url = new URL(request.url)
    const recipeId = url.searchParams.get("recipeId") || "new"
    console.log("Recipe ID:", recipeId)

    // Obtener el archivo de la solicitud
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.error("No file provided")
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    console.log("File received:", file.name, "Size:", file.size, "Type:", file.type)

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 })
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 5MB" }, { status: 400 })
    }

    // Asegurarse de que el bucket existe
    await initializeStorage()

    // Subir la imagen usando nuestra función mejorada
    const publicUrl = await uploadRecipeImage(file, Number.parseInt(recipeId))

    console.log("=== UPLOAD SUCCESSFUL ===")
    console.log("Public URL:", publicUrl)

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Error en la API de subida de imágenes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
