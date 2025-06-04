import { render, screen, fireEvent } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest" // Import jest to declare it

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

describe("RecipeSearch - Clear Filters Button", () => {
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

  test("El botón 'Limpiar' debe resetear completamente el estado y la URL", async () => {
    render(<RecipeSearch categories={mockCategories} />)

    // Verificar que el checkbox está marcado inicialmente
    const checkbox = screen.getByTestId("category-checkbox-9")
    expect(checkbox).toBeChecked()

    // Verificar que se muestran los filtros activos
    const activeFilters = screen.getByTestId("active-filters")
    expect(activeFilters).toBeInTheDocument()
    expect(activeFilters).toHaveTextContent("Pescados")

    // Hacer clic en el botón Limpiar
    const clearButton = screen.getByTestId("clear-filters-button")
    fireEvent.click(clearButton)

    // Verificar que se redirige a /recipes
    expect(window.location.href).toBe("/recipes")
  })

  test("El botón 'Limpiar' debe estar visible solo cuando hay filtros activos", () => {
    // Simular que no hay filtros activos
    mockSearchParams.get.mockImplementation(() => null)
    mockSearchParams.toString.mockReturnValue("")

    const { rerender } = render(<RecipeSearch categories={mockCategories} />)

    // El botón no debería estar visible
    expect(screen.queryByTestId("clear-filters-button")).not.toBeInTheDocument()

    // Simular que hay filtros activos
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      return null
    })
    mockSearchParams.toString.mockReturnValue("categories=9")

    // Re-renderizar con filtros activos
    rerender(<RecipeSearch categories={mockCategories} />)

    // El botón debería estar visible
    expect(screen.getByTestId("clear-filters-button")).toBeInTheDocument()
  })
})
