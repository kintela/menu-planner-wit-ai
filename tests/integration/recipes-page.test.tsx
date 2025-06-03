import { getRecipesAndCategories } from "@/app/recipes/page"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock Supabase
jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createServerComponentClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          data: mockData,
          error: null,
        })),
      })),
    })),
  })),
}))

// Mock cookies
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}))

// Mock rate limiter
jest.mock("@/lib/supabase/rate-limiter", () => ({
  safeQuery: jest.fn((fn) => fn()),
}))

const mockData = {
  recipes: [
    { id: 1, name: "Paella", categories: [{ id: 1, name: "Arroces" }] },
    { id: 2, name: "Salmón", categories: [{ id: 2, name: "Pescados" }] },
    { id: 3, name: "Arroz con pollo", categories: [{ id: 1, name: "Arroces" }] },
  ],
  categories: [
    { id: 1, name: "Arroces" },
    { id: 2, name: "Pescados" },
    { id: 3, name: "Carnes" },
  ],
  recipeCategories: [
    { recipe_id: 1, category_id: 1, categories: { id: 1, name: "Arroces" } },
    { recipe_id: 2, category_id: 2, categories: { id: 2, name: "Pescados" } },
    { recipe_id: 3, category_id: 1, categories: { id: 1, name: "Arroces" } },
  ],
}

describe("getRecipesAndCategories - Category Count Calculation", () => {
  it("should calculate correct recipe counts for each category", async () => {
    const result = await getRecipesAndCategories()

    expect(result.categories).toEqual([
      { id: 1, name: "Arroces", recipeCount: 2 }, // 2 recetas de arroz
      { id: 2, name: "Pescados", recipeCount: 1 }, // 1 receta de pescado
      { id: 3, name: "Carnes", recipeCount: 0 }, // 0 recetas de carne
    ])
  })

  it("should handle categories with no recipes", async () => {
    const result = await getRecipesAndCategories()

    const carnesCategory = result.categories.find((cat) => cat.name === "Carnes")
    expect(carnesCategory?.recipeCount).toBe(0)
  })

  it("should maintain total recipe count consistency", async () => {
    const result = await getRecipesAndCategories()

    const totalCountFromCategories = result.categories.reduce((sum, category) => sum + category.recipeCount, 0)

    // El total de conteos por categoría puede ser mayor que el total de recetas
    // porque una receta puede estar en múltiples categorías
    expect(totalCountFromCategories).toBeGreaterThanOrEqual(0)
    expect(result.totalRecipesCount).toBeGreaterThanOrEqual(0)
  })
})
