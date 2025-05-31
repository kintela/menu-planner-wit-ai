import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Endpoint para probar y diagnosticar problemas de almacenamiento
export async function GET(request: Request) {
  try {
    console.log("=== STORAGE DEBUG ENDPOINT CALLED ===")

    // Verificar variables de entorno
    console.log("Checking environment variables...")
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          supabaseUrl: !!supabaseUrl,
          supabaseServiceKey: !!supabaseServiceKey,
        },
        { status: 500 },
      )
    }

    console.log("Environment variables present")

    // Crear cliente de Supabase
    console.log("Creating Supabase client...")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar buckets existentes
    console.log("Listing storage buckets...")
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error listing buckets:", listError)
      return NextResponse.json({ error: "Error listing buckets", details: listError }, { status: 500 })
    }

    console.log("Buckets found:", buckets?.length || 0)

    // Crear bucket de prueba si no existe
    const testBucketName = "test-bucket"
    let testBucket = buckets?.find((b) => b.name === testBucketName)

    if (!testBucket) {
      console.log("Creating test bucket...")
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(testBucketName, {
        public: true,
      })

      if (createError) {
        console.error("Error creating test bucket:", createError)
        return NextResponse.json({ error: "Error creating test bucket", details: createError }, { status: 500 })
      }

      console.log("Test bucket created")
      testBucket = newBucket
    } else {
      console.log("Test bucket already exists")
    }

    // Crear un archivo de prueba
    console.log("Creating test file...")
    const testFileName = `test-file-${Date.now()}.txt`
    const testContent = "This is a test file to verify storage functionality."

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(testBucketName)
      .upload(testFileName, testContent, {
        contentType: "text/plain",
        upsert: true,
      })

    if (uploadError) {
      console.error("Error uploading test file:", uploadError)
      return NextResponse.json({ error: "Error uploading test file", details: uploadError }, { status: 500 })
    }

    console.log("Test file uploaded successfully")

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(testBucketName).getPublicUrl(testFileName)

    console.log("Public URL generated:", publicUrl)

    // Verificar permisos del bucket
    console.log("Checking bucket permissions...")
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(testBucketName)

    if (bucketError) {
      console.error("Error getting bucket details:", bucketError)
      return NextResponse.json({ error: "Error getting bucket details", details: bucketError }, { status: 500 })
    }

    console.log("Bucket details:", bucketData)

    // Devolver resultados
    return NextResponse.json({
      success: true,
      message: "Storage functionality test completed successfully",
      buckets: buckets?.map((b) => ({ name: b.name, id: b.id })),
      testFile: {
        name: testFileName,
        path: uploadData?.path,
        publicUrl,
      },
      bucketDetails: bucketData,
    })
  } catch (error) {
    console.error("Unexpected error in storage debug endpoint:", error)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
