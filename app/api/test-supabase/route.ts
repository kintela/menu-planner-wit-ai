import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error: "Supabase configuration missing",
          details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test database connection
    const { data, error } = await supabase.from("recipes").select("count").limit(1)

    if (error) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Test auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    return NextResponse.json({
      success: true,
      database: "connected",
      auth: authError ? "error" : "connected",
      userCount: authData?.users?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Supabase test error:", error)
    return NextResponse.json(
      {
        error: "Supabase test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
