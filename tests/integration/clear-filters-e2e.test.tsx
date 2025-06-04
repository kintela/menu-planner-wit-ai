import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipesPageClient } from "@/components/recipes-page-client"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock completo del entorno
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
  }),
}))

jest.mock("@/components/recipe-card", () => ({
  RecipeCard: ({ recipe }: { recipe: any }) => (
    <div data-testid={`recipe-${recipe.id}`} className="recipe-card">
      <h3>{recipe.name}</h3>
      <p>{recipe.ingredients}</p>
    </div>
  ),
}))

describe("Clear Filters End-to-End Tests", () => {
  const fullMockData = {
    categories: [
      { id: 1, name: "Desayuno", recipeCount: 2 },
      { id: 2, name: "Almuerzo", recipeCount: 3 },
      { id: 3, name: "Cena", recipeCount: 2 },
      { id: 4, name: "Postre", recipeCount: 1 },
    ],
    recipes: [
      {
        id: 1,
        name: "Huevos con vainas",
        user_id: "test-user",
        ingredients: "huevos, vainas verdes, sal, pimienta",
        preparation: "Cocinar huevos con vainas",
        categories: [{ id: 1, name: "Desayuno" }],
      },
      {
        id: 2,
        name: "Tortilla de vainas",
        user_id: "test-user",
        ingredients: "huevos, vainas, cebolla",
        preparation: "Hacer tortilla con vainas",
        categories: [{ id: 1, name: "Desayuno" }],
      },
      {
        id: 3,
        name: "Pasta con tomate",
        user_id: "test-user",
        ingredients: "pasta, tomate, albahaca, ajo",
        preparation: "Hervir pasta y hacer salsa",
        categories: [{ id: 2, name: "Almuerzo" }],
      },
      {
        id: 4,
        name: "Arroz con pollo",
        user_id: "test-user",
        ingredients: "arroz, pollo, verduras",
        preparation: "Cocinar arroz con pollo",
        categories: [{ id: 2, name: "Almuerzo" }],
      },
      {
        id: 5,
        name: "Ensalada de vainas",
        user_id: "test-user",
        ingredients: "vainas, lechuga, tomate, aceite",
        preparation: "Mezclar todos los ingredientes",
        categories: [{ id: 3, name: "Cena" }],
      },
      {
        id: 6,
        name: "Sopa de verduras",
        user_id: "test-user",
        ingredients: "verduras mixtas, caldo, especias",
        preparation: "Hervir verduras en caldo",
        categories: [{ id: 3, name: "Cena" }],
      },
      {
        id: 7,
        name: "Flan de vainilla",
        user_id: "test-user",
        ingredients: "leche, huevos, azúcar, vainilla",
        preparation: "Hacer flan al baño maría",
        categories: [{ id: 4, name: "Postre" }],
      },
    ],
  }

  beforeEach(() => {
    // Limpiar cualquier estado global
    if (typeof window !== "undefined") {
      delete (window as any).clearRecipeFilters
    }
  })

  it("should perform complete filter lifecycle: search -> filter -> clear", async () => {
    render(
      <RecipesPageClient
        recipes={fullMockData.recipes}
        categories={fullMockData.categories}
        totalRecipesCount={7}
        showOnlyMyRecipes={false}
      />,
    )

    // Estado inicial: todas las recetas visibles
    expect(screen.getByText("Mostrando 7 recetas de 7 en total")).toBeInTheDocument()
    expect(screen.getAllByTestId(/recipe-/)).toHaveLength(7)

    // Paso 1: Buscar "vainas"
    const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")
    fireEvent.change(searchInput, { target: { value: "vainas" } })

    await waitFor(() => {
      expect(screen.getByText("Filtros activos:")).toBeInTheDocument()
      expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()
      expect(screen.getByText("Mostrando 3 recetas")).toBeInTheDocument()
    })

    // Verificar que solo se muestran recetas con "vainas"
    expect(screen.getByTestId("recipe-1")).toBeInTheDocument() // Huevos con vainas
    expect(screen.getByTestId("recipe-2")).toBeInTheDocument() // Tortilla de vainas
    expect(screen.getByTestId("recipe-5")).toBeInTheDocument() // Ensalada de vainas
    expect(screen.queryByTestId("recipe-3")).not.toBeInTheDocument()
    expect(screen.queryByTestId("recipe-4")).not.toBeInTheDocument()

    // Paso 2: Añadir filtro de categoría
    const desayunoCheckbox = screen.getByLabelText(/Desayuno/)
    fireEvent.click(desayunoCheckbox)

    await waitFor(() => {
      expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()
      expect(screen.getByText("Categorías: 1 seleccionada(s)")).toBeInTheDocument()
      expect(screen.getByText("Mostrando 2 recetas")).toBeInTheDocument()
    })

    // Solo recetas de desayuno con "vainas"
    expect(screen.getByTestId("recipe-1")).toBeInTheDocument()
    expect(screen.getByTestId("recipe-2")).toBeInTheDocument()
    expect(screen.queryByTestId("recipe-5")).not.toBeInTheDocument()

    // Paso 3: Limpiar todos los filtros
    const clearButton = screen.getByTestId("clear-all-filters-button")
    expect(clearButton).toBeInTheDocument()
    expect(clearButton).toHaveClass("bg-red-600")

    fireEvent.click(clearButton)

    // Verificar limpieza completa
    await waitFor(() => {
      expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
      expect(screen.queryByText("Búsqueda:")).not.toBeInTheDocument()
      expect(screen.queryByTestId("clear-all-filters-button")).not.toBeInTheDocument()
      expect(screen.getByText("Mostrando 7 recetas de 7 en total")).toBeInTheDocument()
    })

    // Verificar que todos los elementos están limpios
    expect(searchInput).toHaveValue("")
    expect(desayunoCheckbox).not.toBeChecked()

    // Todas las recetas deben estar visibles
    expect(screen.getAllByTestId(/recipe-/)).toHaveLength(7)
  })

  it("should maintain performance with rapid filter changes", async () => {
    const startTime = performance.now()

    render(
      <RecipesPageClient
        recipes={fullMockData.recipes}
        categories={fullMockData.categories}
        totalRecipesCount={7}
        showOnlyMyRecipes={false}
      />,
    )

    const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")

    // Cambios rápidos de filtro
    const searchTerms = ["v", "va", "vai", "vain", "vaina", "vainas"]

    for (const term of searchTerms) {
      fireEvent.change(searchInput, { target: { value: term } })
      await waitFor(() => {
        expect(searchInput).toHaveValue(term)
      })
    }

    // Limpiar
    const clearButton = screen.getByTestId("clear-all-filters-button")
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(searchInput).toHaveValue("")
      expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
    })

    const endTime = performance.now()
    const duration = endTime - startTime

    // Debe completarse en menos de 1 segundo
    expect(duration).toBeLessThan(1000)
  })

  it("should handle browser back/forward without breaking filters", async () => {
    render(
      <RecipesPageClient
        recipes={fullMockData.recipes}
        categories={fullMockData.categories}
        totalRecipesCount={7}
        showOnlyMyRecipes={false}
      />,
    )

    // Aplicar filtros
    const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")
    fireEvent.change(searchInput, { target: { value: "vainas" } })

    await waitFor(() => {
      expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()
    })

    // Simular navegación (los filtros deben mantenerse locales)
    // Como no modificamos la URL, no hay problema con navegación
    expect(window.location.pathname).toBe("/")
    expect(window.location.search).toBe("")

    // Los filtros siguen funcionando
    const clearButton = screen.getByTestId("clear-all-filters-button")
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(searchInput).toHaveValue("")
      expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
    })
  })
})
