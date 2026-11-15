import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  MAX_PROFILE_BODY_BYTES,
  getOwnProfile,
  parseProfileUpdateRequestBody,
  updateOwnProfile,
} from "@/lib/profile/server-operations"

export const dynamic = "force-dynamic"

async function sessionClient() {
  const cookieStore = await cookies()
  return createServerClient(cookieStore)
}

export async function GET() {
  try {
    const result = await getOwnProfile(await sessionClient())
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ error: "Unable to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PROFILE_BODY_BYTES) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const parsed = parseProfileUpdateRequestBody(await request.text())
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const result = await updateOwnProfile(await sessionClient(), parsed.value, new Date())
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ error: "Unable to update profile" }, { status: 500 })
  }
}
