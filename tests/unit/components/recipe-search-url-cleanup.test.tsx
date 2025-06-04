import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch URL Cleanup", () => {
  const mockRouter = {
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
  })

  test("debería limpiar la URL completamente cuando se desmarcan todas las categorías", async () => {
    // Simular que inicialmente hay una categoría seleccionada
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      if (param === "search") return null
      return null
    })
    mockSearchParams.toString.mockReturnValue("categories=9")

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar que inicialmente la categoría está marcada
    const checkbox = screen.getByLabelText(/Pescados/i)
    expect(checkbox).toBeChecked()

    // Desmarcar la categoría
    fireEvent.click(checkbox)

    // Verificar que la URL se limpia completamente
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
    })
  })

  test("debería limpiar la URL cuando se usa el botón 'Limpiar'", async () => {
    // Simular que hay filtros activos
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      if (param === "search") return "pollo"
      return null
    })
    mockSearchParams.toString.mockReturnValue("categories=9&search=pollo")

    render(<RecipeSearch categories={mockCategories} />)

    // Hacer clic en el botón limpiar
    const clearButton = screen.getByText(/Limpiar/i)
    fireEvent.click(clearButton)

    // Verificar que la URL se limpia completamente
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
    })
  })
})
