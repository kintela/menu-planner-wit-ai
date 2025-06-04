import { render, screen } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { useRouter, useSearchParams } from "next/navigation"
import jest from "jest" // Declare the jest variable

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
  toString: jest.fn(() => ""),
}

describe("RecipeSearch - Category Count", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  it("should display correct recipe count for each category", () => {
    const categoriesWithCount = [
      { id: 1, name: "Arroces", recipeCount: 5, created_at: "2023-01-01" },
      { id: 2, name: "Pescados", recipeCount: 21, created_at: "2023-01-01" },
      { id: 3, name: "Carnes", recipeCount: 15, created_at: "2023-01-01" },
      { id: 4, name: "Postres", recipeCount: 8, created_at: "2023-01-01" },
    ]

    render(<RecipeSearch categories={categoriesWithCount} />)

    // Verificar que cada categoría muestra el conteo correcto
    expect(screen.getByText("Arroces")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()

    expect(screen.getByText("Pescados")).toBeInTheDocument()
    expect(screen.getByText("21")).toBeInTheDocument()

    expect(screen.getByText("Carnes")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()

    expect(screen.getByText("Postres")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
  })

  it("should display zero count for categories without recipes", () => {
    const categoriesWithZeroCount = [
      { id: 1, name: "Arroces", recipeCount: 0, created_at: "2023-01-01" },
      { id: 2, name: "Pescados", recipeCount: 0, created_at: "2023-01-01" },
    ]

    render(<RecipeSearch categories={categoriesWithZeroCount} />)

    // Verificar que las categorías sin recetas muestran 0
    const zeroCounts = screen.getAllByText("0")
    expect(zeroCounts).toHaveLength(2)
  })

  it("should handle empty categories array gracefully", () => {
    render(<RecipeSearch categories={[]} />)

    expect(screen.getByText("No hay categorías disponibles.")).toBeInTheDocument()
  })

  it("should maintain category counts when filters are applied", () => {
    const categoriesWithCount = [
      { id: 1, name: "Arroces", recipeCount: 5, created_at: "2023-01-01" },
      { id: 2, name: "Pescados", recipeCount: 21, created_at: "2023-01-01" },
    ]

    // Simular que hay filtros activos en la URL
    mockSearchParams.get.mockImplementation((param: string) => {
      if (param === "categories") return "1"
      return null
    })

    render(<RecipeSearch categories={categoriesWithCount} />)

    // Los conteos deben mantenerse incluso con filtros activos
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("21")).toBeInTheDocument()
  })
})
