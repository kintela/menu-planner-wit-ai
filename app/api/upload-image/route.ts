import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  console.log("=== UPLOAD IMAGE API CALLED ===")

  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey,
      })
      return NextResponse.json(
        {
          error: "Faltan variables de entorno",
          details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
        },
        { status: 500 },
      )
    }

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

    // Crear cliente de Supabase con la clave de servicio
    console.log("Creating Supabase client with service key...")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Nombre del bucket
    const bucketName = "recipe-images"
    console.log("Using bucket:", bucketName)

    // Verificar si el bucket existe
    console.log("Checking if bucket exists...")
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error listing buckets:", listError)
      return NextResponse.json(
        { error: "Error al acceder al almacenamiento", details: listError.message },
        { status: 500 },
      )
    }

    // Si el bucket no existe, crearlo
    if (!buckets?.find((bucket) => bucket.name === bucketName)) {
      console.log("Bucket not found, creating it...")
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      })

      if (createError) {
        console.error("Error creating bucket:", createError)
        return NextResponse.json(
          { error: "Error al crear el almacenamiento", details: createError.message },
          { status: 500 },
        )
      }
      console.log("Bucket created successfully")
    } else {
      console.log("Bucket already exists")

      // Asegurarse de que el bucket sea público
      console.log("Updating bucket to be public...")
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
      })

      if (updateError) {
        console.error("Error updating bucket:", updateError)
        // Continuar de todos modos
      } else {
        console.log("Bucket updated successfully")
      }
    }

    // Crear un nombre único para el archivo
    const fileExt = file.name.split(".").pop()
    const fileName = `recipe_${recipeId}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`
    console.log("Generated file path:", filePath)

    // Convertir el archivo a ArrayBuffer
    console.log("Converting file to buffer...")
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Subir el archivo
    console.log("Uploading file to Supabase Storage...")
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error uploading file:", error)
      return NextResponse.json({ error: "Error al subir la imagen", details: error.message }, { status: 500 })
    }

    console.log("File uploaded successfully:", data)

    // Obtener la URL pública del archivo
    console.log("Generating public URL...")
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    console.log("Public URL generated:", publicUrl)

    return NextResponse.json({ url: publicUrl, success: true })
  } catch (error) {
    console.error("Error en la API de subida de imágenes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    )
  }
}
