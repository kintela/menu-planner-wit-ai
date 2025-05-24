import { getSupabaseClient } from "./client"

// Nombre del bucket donde se almacenarán las imágenes
export const RECIPE_IMAGES_BUCKET = "recipe-images"

// Función para inicializar el bucket si no existe
export async function initializeStorage() {
  try {
    const supabase = getSupabaseClient()

    // Verificar si el bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error al listar buckets:", listError)
      return false
    }

    // Si el bucket no existe, crearlo
    if (!buckets?.find((bucket) => bucket.name === RECIPE_IMAGES_BUCKET)) {
      const { error: createError } = await supabase.storage.createBucket(RECIPE_IMAGES_BUCKET, {
        public: true, // Hacer el bucket público para que las imágenes sean accesibles
      })

      if (createError) {
        console.error("Error al crear bucket:", createError)
        return false
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
    // Asegurarse de que el bucket existe antes de subir la imagen
    const bucketInitialized = await initializeStorage()
    if (!bucketInitialized) {
      throw new Error("No se pudo inicializar el bucket de almacenamiento")
    }

    const supabase = getSupabaseClient()

    // Crear un nombre único para el archivo
    const fileExt = file.name.split(".").pop()
    const fileName = `recipe_${recipeId || "new"}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // Subir el archivo
    const { data, error } = await supabase.storage.from(RECIPE_IMAGES_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Permitir sobrescribir archivos existentes
    })

    if (error) {
      console.error("Error al subir imagen:", error)
      throw error
    }

    // Obtener la URL pública del archivo
    const {
      data: { publicUrl },
    } = supabase.storage.from(RECIPE_IMAGES_BUCKET).getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error("Error en uploadRecipeImage:", error)
    throw error
  }
}
