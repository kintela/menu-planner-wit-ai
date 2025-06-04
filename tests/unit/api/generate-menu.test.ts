import { POST } from "@/app/api/generate-menu/route"
import { mockSupabaseClient } from "@/tests/__mocks__/supabase"
import jest from "jest" // Declare the jest variable

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
}

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => mockOpenAI)
})

describe("/api/generate-menu", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock environment variables
    process.env.OPENAI_API_KEY = "test-openai-key"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"
  })

  it("should generate menu successfully", async () => {
    // Mock Supabase response
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [{ title: "Pollo al horno", category: "Cenas", difficulty: "Fácil" }],
          error: null,
        }),
      }),
    })

    // Mock OpenAI response
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              menu: [
                {
                  day: "Lunes",
                  breakfast: "Tostadas con aguacate",
                  lunch: "Ensalada César",
                  dinner: "Pollo al horno",
                },
              ],
            }),
          },
        },
      ],
    })

    const request = new Request("http://localhost:3000/api/generate-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: "Comida mediterránea, sin gluten",
        days: 1,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.menu).toHaveLength(1)
    expect(data.menu[0]).toEqual({
      day: "Lunes",
      breakfast: "Tostadas con aguacate",
      lunch: "Ensalada César",
      dinner: "Pollo al horno",
    })
  })

  it("should return error when OpenAI API key is missing", async () => {
    delete process.env.OPENAI_API_KEY

    const request = new Request("http://localhost:3000/api/generate-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: "Test preferences",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("OpenAI API key not configured")
  })

  it("should return error when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const request = new Request("http://localhost:3000/api/generate-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: "Test preferences",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Supabase not configured")
  })

  it("should handle OpenAI API errors", async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    mockOpenAI.chat.completions.create.mockRejectedValue(new Error("OpenAI API Error"))

    const request = new Request("http://localhost:3000/api/generate-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: "Test preferences",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Failed to generate menu")
  })

  it("should handle invalid JSON response from OpenAI", async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })

    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Invalid JSON response",
          },
        },
      ],
    })

    const request = new Request("http://localhost:3000/api/generate-menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: "Test preferences",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Invalid response format from AI")
  })
})
