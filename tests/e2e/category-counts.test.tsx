import { render, screen, waitFor } from "@testing-library/react"
import RecipesPage from "@/app/recipes/page"
import { jest } from "@jest/globals"

// Mock de datos completos
const mockRecipesData = {
  recipes: [
    { id: 1, name: "Paella Valenciana", categories: [{ id: 1, name: "Arroces" }] },
    { id: 2, name: "Arroz con Pollo", categories: [{ id: 1, name: "Arroces" }] },
    { id: 3, name: "Salmón Grillado", categories: [{ id: 2, name: "Pescados" }] },
    { id: 4, name: "Bacalao al Pil Pil", categories: [{ id: 2, name: "Pescados" }] },
    { id: 5, name: "Merluza en Salsa", categories: [{ id: 2, name: "Pescados" }] },
  ],
  categories: [
    { id: 1, name: "Arroces", recipeCount: 2 },
    { id: 2, name: "Pescados", recipeCount: 3 },
    { id: 3, name: "Carnes", recipeCount: 0 },
    { id: 4, name: "Postres", recipeCount: 0 },
  ],
  totalRecipesCount: 5,
  dataQuality: {
    hasFullRecipeData: true,
    hasCategoriesData: true,
    hasRelationsData: true,
  },
}

// Mock de la función getRecipesAndCategories
jest.mock("@/app/recipes/page", () => ({
  ...jest.requireActual("@/app/recipes/page"),
  getRecipesAndCategories: jest.fn(() => Promise.resolve(mockRecipesData)),
}))

describe("Recipes Page - Category Counts E2E", () => {
  it("should display correct category counts in the UI", async () => {
    render(<RecipesPage searchParams={{}} />)

    await waitFor(() => {
      // Verificar que los conteos se muestran correctamente
      expect(screen.getByText("Arroces")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument() // Conteo de Arroces

      expect(screen.getByText("Pescados")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument() // Conteo de Pescados

      expect(screen.getByText("Carnes")).toBeInTheDocument()
      expect(screen.getAllByText("0")).toHaveLength(2) // Carnes y Postres con 0
    })
  })

  it("should maintain category counts when page loads with filters", async () => {
    render(<RecipesPage searchParams={{ categories: "1" }} />)

    await waitFor(() => {
      // Los conteos deben mantenerse incluso con filtros aplicados
      expect(screen.getByText("2")).toBeInTheDocument() // Arroces
      expect(screen.getByText("3")).toBeInTheDocument() // Pescados
    })
  })
})
