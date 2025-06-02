import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      return NextResponse.json(
        {
          error: "Error listing buckets",
          details: bucketsError,
        },
        { status: 500 },
      )
    }

    // Verificar archivos en recipe-images si existe
    let recipeImagesFiles = null
    let avatarsFiles = null

    const recipeImagesBucket = buckets?.find((bucket) => bucket.name === "recipe-images")
    if (recipeImagesBucket) {
      const { data: files, error: filesError } = await supabase.storage.from("recipe-images").list("", {
        limit: 10,
      })

      if (!filesError) {
        recipeImagesFiles = files
      }
    }

    const avatarsBucket = buckets?.find((bucket) => bucket.name === "avatars")
    if (avatarsBucket) {
      const { data: files, error: filesError } = await supabase.storage.from("avatars").list("", {
        limit: 10,
      })

      if (!filesError) {
        avatarsFiles = files
      }
    }

    return NextResponse.json({
      buckets,
      recipeImagesFiles,
      avatarsFiles,
      debug: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error("Debug storage error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
