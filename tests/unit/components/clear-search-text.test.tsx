import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch - Limpiar búsqueda de texto", () => {
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

  test("CRÍTICO: Limpiar debe vaciar el campo de búsqueda 'vainas'", async () => {
    // Simular búsqueda activa de "vainas"
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return null
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial con búsqueda
    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    expect(searchInput.value).toBe("vainas")
    expect(screen.getByTestId("active-filters")).toHaveTextContent('Búsqueda: "vainas"')
    expect(screen.getByTestId("clear-filters-button")).toBeInTheDocument()

    // Hacer clic en Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que el input se vacía inmediatamente
    await waitFor(() => {
      expect(searchInput.value).toBe("")
    })

    // Verificar que se llama a router.replace
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
    })
  })

  test("CRÍTICO: Limpiar debe funcionar con búsqueda + categorías", async () => {
    // Simular búsqueda + categoría activa
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial
    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    expect(searchInput.value).toBe("vainas")
    expect(screen.getByTestId("category-checkbox-9")).toBeChecked()

    // Hacer clic en Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que todo se limpia
    await waitFor(() => {
      expect(searchInput.value).toBe("")
      expect(screen.getByTestId("category-checkbox-9")).not.toBeChecked()
    })
  })

  test("El botón Limpiar debe deshabilitarse durante la limpieza", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    const clearButton = screen.getByTestId("clear-filters-button")

    // Hacer clic en Limpiar
    fireEvent.click(clearButton)

    // Verificar que el botón se deshabilita temporalmente
    expect(clearButton).toBeDisabled()
    expect(clearButton).toHaveTextContent("Limpiando...")
  })
})
