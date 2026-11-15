import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  MAX_EMAIL_BODY_BYTES,
  changeOwnEmail,
  parseEmailChangeRequestBody,
} from "@/lib/profile/server-operations"

export const dynamic = "force-dynamic"

async function sessionClient() {
  const cookieStore = await cookies()
  return createServerClient(cookieStore)
}

export async function PUT(request: NextRequest) {
  try {
    const declaredLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_EMAIL_BODY_BYTES) {
      return NextResponse.json(
        {
          emailChange: {
            state: "rejected",
            code: "INVALID_REQUEST",
            message: "A valid email is required",
          },
        },
        { status: 400 },
      )
    }

    const parsed = parseEmailChangeRequestBody(await request.text())
    if (!parsed.ok) {
      return NextResponse.json(
        {
          emailChange: {
            state: "rejected",
            code: "INVALID_REQUEST",
            message: "A valid email is required",
          },
        },
        { status: 400 },
      )
    }

    const result = await changeOwnEmail(await sessionClient(), parsed.value)
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json(
      {
        emailChange: {
          state: "rejected",
          code: "EMAIL_CHANGE_FAILED",
          message: "Unable to change email",
        },
      },
      { status: 500 },
    )
  }
}
