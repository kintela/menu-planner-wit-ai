import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock fetch global
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("/api/generate-recipe-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variables
    process.env.OPENAI_API_KEY = "test-api-key"
  })

  it("should generate recipe suggestions successfully", async () => {
    // Mock OpenAI API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                recipes: [
                  {
                    name: "Pasta Italiana",
                    description: "Deliciosa pasta con salsa de tomate",
                    ingredients: "Pasta\nTomate\nAlbahaca\nAjo",
                    preparation: "Hervir pasta\nPreparar salsa\nMezclar",
                  },
                ],
              }),
            },
          },
        ],
      }),
    })

    // Import the route handler
    const { POST } = await import("@/app/api/generate-recipe-suggestions/route")

    // Create a mock request
    const request = new Request("http://localhost/api/generate-recipe-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchQuery: "pasta italiana",
        mealType: "comida",
        dishOrder: 1,
        dayName: "Lunes",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipes).toHaveLength(1)
    expect(data.recipes[0].name).toBe("Pasta Italiana")
    expect(data.recipes[0].ingredients).toContain("Pasta")
  })

  it("should handle missing OpenAI API key", async () => {
    delete process.env.OPENAI_API_KEY

    const { POST } = await import("@/app/api/generate-recipe-suggestions/route")

    const request = new Request("http://localhost/api/generate-recipe-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchQuery: "pasta",
        mealType: "comida",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain("OpenAI API key")
  })

  it("should handle OpenAI API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    })

    const { POST } = await import("@/app/api/generate-recipe-suggestions/route")

    const request = new Request("http://localhost/api/generate-recipe-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchQuery: "pasta",
        mealType: "comida",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain("Error de autenticación")
  })

  it("should validate required fields", async () => {
    const { POST } = await import("@/app/api/generate-recipe-suggestions/route")

    const request = new Request("http://localhost/api/generate-recipe-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Missing searchQuery
        mealType: "comida",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("searchQuery es requerido")
  })
})
