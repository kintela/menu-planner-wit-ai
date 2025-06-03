import { render, screen, fireEvent } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock de window.location
const originalLocation = window.location
delete window.location
window.location = {
  ...originalLocation,
  href: "/recipes?categories=9",
  assign: jest.fn(),
  replace: jest.fn(),
}

describe("RecipeSearch - Integración de limpieza de filtros", () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
    toString: jest.fn(),
  }

  const mockCategories = [
    { id: 9, name: "Pescados", recipeCount: 21 },
    { id: 10, name: "Carnes", recipeCount: 15 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    // Simular que hay categorías seleccionadas
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      if (param === "search") return null
      return null
    })

    mockSearchParams.toString.mockReturnValue("categories=9")
  })

  afterAll(() => {
    window.location = originalLocation
  })

  test("Verificación completa del flujo de limpieza de filtros", async () => {
    // Renderizar componente con filtros activos
    render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial
    expect(screen.getByTestId("category-checkbox-9")).toBeChecked()
    expect(screen.queryByTestId("category-checkbox-10")).not.toBeChecked()
    expect(screen.getByTestId("active-filters")).toHaveTextContent("Pescados")

    // Hacer clic en el botón Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se redirige a /recipes
    expect(window.location.href).toBe("/recipes")

    // Simular que la URL ya está limpia
    mockSearchParams.get.mockImplementation(() => null)
    mockSearchParams.toString.mockReturnValue("")

    // Re-renderizar para simular la recarga
    const { rerender } = render(<RecipeSearch categories={mockCategories} />)

    // Verificar que no hay filtros activos
    expect(screen.queryByTestId("active-filters")).not.toBeInTheDocument()
    expect(screen.queryByTestId("category-checkbox-9")).not.toBeChecked()
    expect(screen.queryByTestId("category-checkbox-10")).not.toBeChecked()
  })
})
