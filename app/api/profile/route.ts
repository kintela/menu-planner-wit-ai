import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !url) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    const headersList = await headers()
    const authHeader = headersList.get("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 })
    }

    const token = authHeader.slice(7)

    const adminAuthClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      data: { user },
      error,
    } = await adminAuthClient.auth.getUser(token)

    if (error || !user) {
      console.warn("[api/profile] auth.getUser con token falló", error)
      return NextResponse.json({ error: "Invalid access token" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await adminAuthClient
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("[api/profile] Error fetching profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("[api/profile] Unexpected error:", error)
    return NextResponse.json({ error: "Unexpected error fetching profile" }, { status: 500 })
  }
}
