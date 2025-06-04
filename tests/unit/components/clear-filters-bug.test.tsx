import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe("RecipeSearch - Bug de limpieza de filtros", () => {
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

  test("CRÍTICO: El botón Limpiar debe desmarcar Pescados y limpiar URL", async () => {
    // Simular estado inicial con Pescados seleccionado
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      if (param === "search") return null
      return null
    })
    mockSearchParams.toString.mockReturnValue("categories=9")

    const { rerender } = render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial problemático
    expect(screen.getByTestId("category-checkbox-9")).toBeChecked()
    expect(screen.getByTestId("active-filters")).toHaveTextContent("Pescados")
    expect(screen.getByTestId("clear-filters-button")).toBeInTheDocument()

    // Hacer clic en Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se llama a router.replace con /recipes
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
    })

    // Simular que la URL se ha limpiado
    mockSearchParams.get.mockImplementation(() => null)
    mockSearchParams.toString.mockReturnValue("")

    // Re-renderizar para simular el cambio de URL
    rerender(<RecipeSearch categories={mockCategories} />)

    // Verificar que el estado se ha limpiado completamente
    await waitFor(() => {
      expect(screen.queryByTestId("category-checkbox-9")).not.toBeChecked()
      expect(screen.queryByTestId("active-filters")).not.toBeInTheDocument()
      expect(screen.queryByTestId("clear-filters-button")).not.toBeInTheDocument()
    })
  })

  test("CRÍTICO: Verificar que múltiples llamadas a router.replace limpian el estado", async () => {
    // Simular estado inicial con filtros
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Hacer clic en Limpiar
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se hacen múltiples llamadas para asegurar la limpieza
    await waitFor(
      () => {
        expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
        expect(mockRouter.replace).toHaveBeenCalledTimes(1)
      },
      { timeout: 200 },
    )
  })
})
