import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import { jest } from "@jest/globals"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch - Solución para entorno v0", () => {
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
  })

  test("CRÍTICO: Debe reinicializar completamente el componente al limpiar", async () => {
    // Simular estado inicial con búsqueda "vaina"
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vaina"
      if (param === "categories") return null
      return null
    })

    const { rerender } = render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial
    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    expect(searchInput.value).toBe("vaina")
    expect(screen.getByTestId("active-filters")).toBeInTheDocument()

    // Hacer clic en Limpiar
    const clearButton = screen.getByTestId("clear-filters-button")
    fireEvent.click(clearButton)

    // Simular que la URL cambió después de limpiar
    mockSearchParams.get.mockImplementation(() => null)

    // Re-renderizar para simular el cambio de props
    rerender(<RecipeSearch categories={mockCategories} />)

    // Verificar que el componente se reinicializó
    await waitFor(() => {
      expect(searchInput.value).toBe("")
    })

    // Verificar que se llamó a router.replace
    expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
  })

  test("Debe usar variant='destructive' para el botón Limpiar", () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vaina"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    const clearButton = screen.getByTestId("clear-filters-button")
    expect(clearButton).toHaveClass("bg-destructive") // o la clase correspondiente
  })

  test("Debe forzar re-render completo con key", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vaina"
      return null
    })

    const { container } = render(<RecipeSearch categories={mockCategories} />)
    const initialKey = container.firstChild?.getAttribute?.("key") || "0"

    // Limpiar filtros
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // El key debería haber cambiado para forzar re-render
    await waitFor(() => {
      const newKey = container.firstChild?.getAttribute?.("key") || "0"
      expect(newKey).not.toBe(initialKey)
    })
  })
})
