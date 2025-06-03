import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useRouter, useSearchParams } from "next/navigation"
import { RecipeSearch } from "@/components/recipe-search"
import jest from "jest" // Import jest to declare the variable

// Mock Next.js hooks
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()

const mockCategories = [
  { id: 9, name: "Pescados", recipeCount: 21 },
  { id: 1, name: "Arroces", recipeCount: 2 },
]

describe("RecipeSearch URL Synchronization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
  })

  it("should sync checkbox state with URL parameters on mount", async () => {
    // Mock URL with categories=9 parameter
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === "categories") return "9"
        if (key === "search") return null
        return null
      },
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verify that Pescados checkbox is checked
    const pescadosCheckbox = screen.getByLabelText(/Pescados/)
    expect(pescadosCheckbox).toBeChecked()

    // Verify that Arroces checkbox is not checked
    const arrocesCheckbox = screen.getByLabelText(/Arroces/)
    expect(arrocesCheckbox).not.toBeChecked()
  })

  it("should clear URL when unchecking the last selected category", async () => {
    // Mock URL with categories=9 parameter
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === "categories") return "9"
        if (key === "search") return null
        return null
      },
    })

    render(<RecipeSearch categories={mockCategories} />)

    const pescadosCheckbox = screen.getByLabelText(/Pescados/)

    // Uncheck the pescados category
    fireEvent.click(pescadosCheckbox)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/recipes")
    })
  })

  it("should handle empty URL parameters correctly", async () => {
    // Mock URL without parameters
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: () => null,
    })

    render(<RecipeSearch categories={mockCategories} />)

    // Verify that no checkboxes are checked
    const pescadosCheckbox = screen.getByLabelText(/Pescados/)
    const arrocesCheckbox = screen.getByLabelText(/Arroces/)

    expect(pescadosCheckbox).not.toBeChecked()
    expect(arrocesCheckbox).not.toBeChecked()
  })
})
