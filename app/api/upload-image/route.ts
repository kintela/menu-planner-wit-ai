import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    // Crear cliente de Supabase
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error al listar buckets:", listError)
      return NextResponse.json(
        { error: "Error al acceder al almacenamiento", details: listError.message },
        { status: 500 },
      )
    }

    const bucketName = "recipe-images"

    // Si el bucket no existe, crearlo
    if (!buckets?.find((bucket) => bucket.name === bucketName)) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })

      if (createError) {
        console.error("Error al crear bucket:", createError)
        return NextResponse.json(
          { error: "Error al crear el almacenamiento", details: createError.message },
          { status: 500 },
        )
      }
    }

    // Crear un nombre único para el archivo
    const fileExt = file.name.split(".").pop()
    const fileName = `recipe_${recipeId}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Subir el archivo
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error al subir imagen:", error)
      return NextResponse.json({ error: "Error al subir la imagen", details: error.message }, { status: 500 })
    }

    // Obtener la URL pública del archivo
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    console.log("=== UPLOAD SUCCESSFUL ===")
    console.log("File path:", filePath)
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
