import { render } from "@testing-library/react"
import { RecipeCard } from "@/components/recipe-card"
import { AuthProvider } from "@/components/auth/auth-provider"
import { jest } from "@jest/globals"

// Mock console.log para detectar si se está llamando
const originalConsoleLog = console.log
let consoleLogCalls: any[] = []

beforeEach(() => {
  consoleLogCalls = []
  console.log = jest.fn((...args) => {
    consoleLogCalls.push(args)
  })
})

afterEach(() => {
  console.log = originalConsoleLog
})

const mockRecipe = {
  id: 1,
  name: "Test Recipe",
  user_id: "test-user",
  image_url: "/test-image.jpg",
  categories: [],
  calories: 500,
}

const mockUser = {
  id: "test-user",
  email: "test@example.com",
}

describe("RecipeCard - No Debug Logs", () => {
  it("no debería generar logs de debug en consola", () => {
    render(
      <AuthProvider>
        <RecipeCard recipe={mockRecipe} />
      </AuthProvider>,
    )

    // Verificar que no hay logs de debug
    const debugLogs = consoleLogCalls.filter((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("RecipeCard Debug")),
    )

    expect(debugLogs).toHaveLength(0)
  })

  it("no debería generar logs infinitos al re-renderizar", () => {
    const { rerender } = render(
      <AuthProvider>
        <RecipeCard recipe={mockRecipe} />
      </AuthProvider>,
    )

    // Limpiar logs previos
    consoleLogCalls = []

    // Re-renderizar múltiples veces
    for (let i = 0; i < 5; i++) {
      rerender(
        <AuthProvider>
          <RecipeCard recipe={{ ...mockRecipe, name: `Recipe ${i}` }} />
        </AuthProvider>,
      )
    }

    // Verificar que no hay logs de debug después de múltiples renders
    const debugLogs = consoleLogCalls.filter((call) =>
      call.some((arg) => typeof arg === "string" && arg.includes("Debug")),
    )

    expect(debugLogs).toHaveLength(0)
  })
})
