import { render, screen, fireEvent } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import { jest } from "@jest/globals"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock de console.log para capturar logs
const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {})

describe("RecipeSearch - Debug de limpieza", () => {
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
    consoleSpy.mockClear()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  test("DEBUG: Debe mostrar información de estado", () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar que se muestra la información de debug
    expect(screen.getByText(/DEBUG:/)).toBeInTheDocument()
    expect(screen.getByText(/searchTerm="vainas"/)).toBeInTheDocument()
  })

  test("DEBUG: Debe mostrar ambos botones de limpiar", () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar que ambos botones están presentes
    expect(screen.getByTestId("clear-filters-button")).toBeInTheDocument()
    expect(screen.getByTestId("clear-filters-step-button")).toBeInTheDocument()
  })

  test("DEBUG: Debe capturar logs al hacer clic en limpiar", () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Hacer clic en el primer botón de limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se capturan los logs
    expect(consoleSpy).toHaveBeenCalledWith("=== INICIANDO LIMPIEZA RADICAL ===")
  })

  test("DEBUG: Debe mostrar estado antes y después", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Hacer clic en el segundo botón (paso a paso)
    fireEvent.click(screen.getByTestId("clear-filters-step-button"))

    // Verificar logs de limpieza paso a paso
    expect(consoleSpy).toHaveBeenCalledWith("=== LIMPIEZA PASO A PASO ===")
  })
})
