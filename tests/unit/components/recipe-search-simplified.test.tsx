import { render, screen, fireEvent } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch - Lógica simplificada", () => {
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

  test("No debe causar bucles infinitos", async () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar que el componente se renderiza sin errores
    expect(screen.getByTestId("search-input")).toBeInTheDocument()

    // Verificar que router.replace no se llama infinitamente
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  test("Inicializa correctamente desde URL", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar inicialización
    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    expect(searchInput.value).toBe("vainas")
    expect(screen.getByTestId("category-checkbox-9")).toBeChecked()
  })

  test("Limpiar funciona correctamente", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Hacer clic en Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se llama a router.replace con URL limpia
    expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
  })

  test("Cambio de categoría aplica filtros inmediatamente", async () => {
    mockSearchParams.get.mockReturnValue(null)

    render(<RecipeSearch categories={mockCategories} />)

    // Seleccionar una categoría
    fireEvent.click(screen.getByTestId("category-checkbox-9"))

    // Verificar que se aplican los filtros
    expect(mockRouter.replace).toHaveBeenCalledWith("/recipes?categories=9")
  })
})
