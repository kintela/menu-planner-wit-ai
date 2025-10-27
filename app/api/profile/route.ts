import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !url) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    let resolvedUserId: string | null = null
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)
      const adminAuthClient = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await adminAuthClient.auth.getUser(token)

      if (tokenError) {
        console.warn("[api/profile] auth.getUser con token falló", tokenError)
      } else if (tokenUser) {
        resolvedUserId = tokenUser.id
      }
    }

    if (!resolvedUserId) {
      const cookieStore = await cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }

      resolvedUserId = user.id
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", resolvedUserId)
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
