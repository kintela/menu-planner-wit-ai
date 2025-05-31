import { createClient } from "@supabase/supabase-js"

// Nombre del bucket donde se almacenarán las imágenes
export const RECIPE_IMAGES_BUCKET = "recipe-images"

// Función para obtener un cliente de Supabase con la clave de servicio
// Esto es necesario para operaciones de almacenamiento que requieren más permisos
export function getServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Función para inicializar el bucket si no existe
export async function initializeStorage() {
  try {
    const supabase = getServiceClient()
    console.log("Initializing storage with service client")

    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error al listar buckets:", listError)
      return false
    }

    // Si el bucket no existe, crearlo
    if (!buckets?.find((bucket) => bucket.name === RECIPE_IMAGES_BUCKET)) {
      console.log("Bucket not found, creating:", RECIPE_IMAGES_BUCKET)
      const { error: createError } = await supabase.storage.createBucket(RECIPE_IMAGES_BUCKET, {
        public: true, // Hacer el bucket público para que las imágenes sean accesibles
      })

      if (createError) {
        console.error("Error al crear bucket:", createError)
        return false
      }
      console.log("Bucket created successfully")
    } else {
      console.log("Bucket already exists:", RECIPE_IMAGES_BUCKET)

      // Asegurarse de que el bucket sea público
      const { error: updateError } = await supabase.storage.updateBucket(RECIPE_IMAGES_BUCKET, {
        public: true,
      })

      if (updateError) {
        console.error("Error al actualizar bucket:", updateError)
      } else {
        console.log("Bucket updated to be public")
      }
    }

    return true
  } catch (error) {
    console.error("Error en initializeStorage:", error)
    return false
  }
}

// Función para subir una imagen al bucket
export async function uploadRecipeImage(file: File, recipeId?: number) {
  try {
    console.log("Starting image upload process for recipe:", recipeId)

    // Asegurarse de que el bucket existe antes de subir la imagen
    const bucketInitialized = await initializeStorage()
    if (!bucketInitialized) {
      throw new Error("No se pudo inicializar el bucket de almacenamiento")
    }

    const supabase = getServiceClient()

    // Crear un nombre único para el archivo
    const fileExt = file.name.split(".").pop()
    const fileName = `recipe_${recipeId || "new"}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    console.log("Uploading file:", fileName)

    // Convertir el archivo a ArrayBuffer para la subida
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Subir el archivo
    const { data, error } = await supabase.storage.from(RECIPE_IMAGES_BUCKET).upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true, // Permitir sobrescribir archivos existentes
    })

    if (error) {
      console.error("Error al subir imagen:", error)
      throw error
    }

    console.log("File uploaded successfully:", data)

    // Obtener la URL pública del archivo
    const {
      data: { publicUrl },
    } = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(filePath)

    console.log("Public URL generated:", publicUrl)

    return publicUrl
  } catch (error) {
    console.error("Error en uploadRecipeImage:", error)
    throw error
  }
}

// Función para verificar si una imagen existe en el bucket
export async function checkImageExists(url: string): Promise<boolean> {
  try {
    // Extraer el nombre del archivo de la URL
    const fileName = url.split("/").pop()
    if (!fileName) return false

    const supabase = getServiceClient()

    // Verificar si el archivo existe
    const { data, error } = await supabase.storage.from(RECIPE_IMAGES_BUCKET).list("", {
      search: fileName,
    })

    if (error) {
      console.error("Error checking if image exists:", error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error("Error checking image:", error)
    return false
  }
}
