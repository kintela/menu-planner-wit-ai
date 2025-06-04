import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest" // Import jest to declare it

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch Component", () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
  }

  const mockCategories = [
    { id: 9, name: "Pescados", recipeCount: 5 },
    { id: 10, name: "Carnes", recipeCount: 8 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return null
      if (param === "search") return null
      return null
    })
  })

  test("debería actualizar la URL cuando se selecciona una categoría", async () => {
    render(<RecipeSearch categories={mockCategories} />)

    // Simular selección de categoría
    const checkbox = screen.getByLabelText(/Pescados/i)
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/recipes?categories=9")
    })
  })

  test("debería quitar el parámetro de categoría cuando se deseleccionan todas", async () => {
    // Simular que ya hay una categoría seleccionada
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Simular deselección de la única categoría
    const checkbox = screen.getByLabelText(/Pescados/i)
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/recipes")
    })
  })
})
