import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import { jest } from "@jest/globals"

// Mock de next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock de window.location
Object.defineProperty(window, "location", {
  value: {
    href: "",
    pathname: "/recipes",
    search: "",
  },
  writable: true,
})

describe("RecipeSearch - Solución agresiva para limpiar filtros", () => {
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

    // Reset window.location
    window.location.href = "/recipes?search=vainas"
    window.location.search = "?search=vainas"
  })

  test("CRÍTICO: Debe limpiar 'vainas' del input y URL", async () => {
    // Simular estado inicial con búsqueda "vainas"
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return null
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verificar estado inicial
    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    expect(searchInput.value).toBe("vainas")
    expect(screen.getByTestId("active-filters")).toBeInTheDocument()

    // Hacer clic en Limpiar
    const clearButton = screen.getByTestId("clear-filters-button")
    fireEvent.click(clearButton)

    // Verificar limpieza inmediata
    await waitFor(
      () => {
        expect(searchInput.value).toBe("")
      },
      { timeout: 1000 },
    )

    // Verificar que se llama a router.replace con /recipes
    expect(mockRouter.replace).toHaveBeenCalledWith("/recipes")
  })

  test("CRÍTICO: Debe manejar el caso de búsqueda + categoría", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      if (param === "categories") return "9"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    const searchInput = screen.getByTestId("search-input") as HTMLInputElement
    const categoryCheckbox = screen.getByTestId("category-checkbox-9") as HTMLInputElement

    // Verificar estado inicial
    expect(searchInput.value).toBe("vainas")
    expect(categoryCheckbox.checked).toBe(true)

    // Limpiar filtros
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que todo se limpia
    await waitFor(() => {
      expect(searchInput.value).toBe("")
      expect(categoryCheckbox.checked).toBe(false)
    })
  })

  test("Debe disparar evento input en el DOM para sincronización", async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === "search") return "vainas"
      return null
    })

    render(<RecipeSearch categories={mockCategories} />)

    const searchInput = screen.getByTestId("search-input") as HTMLInputElement

    // Spy en dispatchEvent
    const dispatchEventSpy = jest.spyOn(searchInput, "dispatchEvent")

    // Limpiar filtros
    fireEvent.click(screen.getByTestId("clear-filters-button"))

    // Verificar que se dispara evento input
    expect(dispatchEventSpy).toHaveBeenCalled()
  })
})
