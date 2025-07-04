import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("GET request for recipe:", params.id)

    // Simple response for now
    return NextResponse.json({
      id: params.id,
      name: "Test Recipe",
      message: "GET endpoint working",
    })
  } catch (error) {
    console.error("Error in GET:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PUT request received for recipe:", params.id)
    console.log("Creating simple response...")

    const body = await request.json()
    const userId = request.headers.get("x-user-id")

    console.log("User ID from header:", userId)
    console.log("Request body received:", !!body)

    if (!userId) {
      console.log("No user ID provided")
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 })
    }

    console.log("Simulating successful update...")

    // For now, just return success without actually updating
    const mockUpdatedRecipe = {
      id: params.id,
      name: body.name,
      ingredients: body.ingredients,
      preparation: body.preparation,
      image_url: body.image_url,
      calories: body.calories,
      source_url: body.source_url,
      video_url: body.video_url,
      updated_at: new Date().toISOString(),
    }

    console.log("Returning mock success response")
    return NextResponse.json({ success: true, recipe: mockUpdatedRecipe })
  } catch (error) {
    console.error("Error in PUT /api/recipes/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("DELETE request for recipe:", params.id)
    return NextResponse.json({ success: true, message: "Recipe deleted" })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
