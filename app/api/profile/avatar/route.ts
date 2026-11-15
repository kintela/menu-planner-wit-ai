import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  MAX_AVATAR_REQUEST_BYTES,
  deleteOwnAvatar,
  replaceOwnAvatar,
} from "@/lib/profile/avatar-server-operations"

export const dynamic = "force-dynamic"

async function sessionClient() {
  const cookieStore = await cookies()
  return createServerClient(cookieStore)
}

function withoutCanonicalReference(body: Record<string, unknown>) {
  if (!body.avatar || typeof body.avatar !== "object" || Array.isArray(body.avatar)) return body
  const avatar = { ...(body.avatar as Record<string, unknown>) }
  delete avatar.reference
  return { ...body, avatar }
}

function invalidFileResponse() {
  return NextResponse.json(
    { avatar: { state: "failed", code: "INVALID_AVATAR_FILE" } },
    { status: 400 },
  )
}

export async function POST(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_AVATAR_REQUEST_BYTES) {
      return invalidFileResponse()
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return invalidFileResponse()
    }

    const formData = await request.formData()
    const entries = Array.from(formData.entries())
    if (entries.length !== 1 || entries[0][0] !== "avatar" || !(entries[0][1] instanceof File)) {
      return invalidFileResponse()
    }

    const result = await replaceOwnAvatar(await sessionClient(), entries[0][1], new Date())
    return NextResponse.json(withoutCanonicalReference(result.body), { status: result.status })
  } catch {
    return NextResponse.json(
      { avatar: { state: "failed", code: "AVATAR_REPLACEMENT_FAILED" } },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const result = await deleteOwnAvatar(await sessionClient())
    return NextResponse.json(withoutCanonicalReference(result.body), { status: result.status })
  } catch {
    return NextResponse.json(
      { avatar: { state: "failed", code: "AVATAR_RESET_FAILED" } },
      { status: 500 },
    )
  }
}
