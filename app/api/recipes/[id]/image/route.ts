import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { MAX_RECIPE_IMAGE_REQUEST_BYTES, deleteRecipeImage, replaceRecipeImage } from "@/lib/recipes/recipe-image-server-operations"

type RouteContext = { params: Promise<{ id: string }> }

function invalidFileResponse() {
  return NextResponse.json({ image: { state: "failed", code: "INVALID_RECIPE_IMAGE_FILE" } }, { status: 400 })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const declaredLength = Number(request.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RECIPE_IMAGE_REQUEST_BYTES) return invalidFileResponse()
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return invalidFileResponse()
  try {
    const formData = await request.formData()
    const entries = Array.from(formData.entries())
    if (entries.length !== 1 || entries[0][0] !== "image" || !(entries[0][1] instanceof File)) return invalidFileResponse()
    const { id } = await params
    const result = await replaceRecipeImage(createClient(await cookies()), id, entries[0][1], new Date())
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ image: { state: "failed", code: "RECIPE_IMAGE_REPLACEMENT_FAILED" } }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const result = await deleteRecipeImage(createClient(await cookies()), id)
    return NextResponse.json(result.body, { status: result.status })
  } catch {
    return NextResponse.json({ image: { state: "failed", code: "RECIPE_IMAGE_REMOVAL_FAILED" } }, { status: 500 })
  }
}
