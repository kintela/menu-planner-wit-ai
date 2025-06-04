import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RecipeSearch } from "@/components/recipe-search"
import { RecipesClientFilter } from "@/components/recipes-client-filter"
import { RecipesPageClient } from "@/components/recipes-page-client"
import jest from "jest" // Import jest to fix the undeclared variable error

// Mock de useAuth
jest.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com" },
  }),
}))

// Mock de RecipeCard
jest.mock("@/components/recipe-card", () => ({
  RecipeCard: ({ recipe }: { recipe: any }) => <div data-testid={`recipe-${recipe.id}`}>{recipe.name}</div>,
}))

describe("Clear Filters Functionality", () => {
  const mockCategories = [
    { id: 1, name: "Desayuno", recipeCount: 5 },
    { id: 2, name: "Almuerzo", recipeCount: 10 },
    { id: 3, name: "Cena", recipeCount: 8 },
  ]

  const mockRecipes = [
    {
      id: 1,
      name: "Huevos con vainas",
      user_id: "test-user",
      ingredients: "huevos, vainas, sal",
      preparation: "Cocinar todo junto",
      categories: [{ id: 1, name: "Desayuno" }],
    },
    {
      id: 2,
      name: "Pasta con tomate",
      user_id: "test-user",
      ingredients: "pasta, tomate, albahaca",
      preparation: "Hervir pasta y mezclar",
      categories: [{ id: 2, name: "Almuerzo" }],
    },
    {
      id: 3,
      name: "Ensalada de vainas",
      user_id: "test-user",
      ingredients: "vainas, lechuga, aceite",
      preparation: "Mezclar ingredientes",
      categories: [{ id: 3, name: "Cena" }],
    },
  ]

  describe("RecipeSearch Component", () => {
    it("should clear search term when onClearFilters is called", async () => {
      const mockOnFiltersChange = jest.fn()
      const mockOnClearFilters = jest.fn()

      render(
        <RecipeSearch
          categories={mockCategories}
          searchTerm="vainas"
          selectedCategories={[1, 2]}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />,
      )

      // Verificar que los filtros activos se muestran
      expect(screen.getByText("Filtros activos:")).toBeInTheDocument()
      expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()

      // Simular limpieza
      const searchInput = screen.getByDisplayValue("vainas")
      expect(searchInput).toBeInTheDocument()

      // Limpiar manualmente (simular el comportamiento del botón)
      fireEvent.change(searchInput, { target: { value: "" } })

      expect(mockOnFiltersChange).toHaveBeenCalledWith("", [1, 2])
    })

    it("should not show active filters when searchTerm and selectedCategories are empty", () => {
      const mockOnFiltersChange = jest.fn()
      const mockOnClearFilters = jest.fn()

      render(
        <RecipeSearch
          categories={mockCategories}
          searchTerm=""
          selectedCategories={[]}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />,
      )

      // No debe mostrar filtros activos
      expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
      expect(screen.queryByText("Búsqueda:")).not.toBeInTheDocument()
    })

    it("should sync input value with searchTerm prop", () => {
      const mockOnFiltersChange = jest.fn()
      const mockOnClearFilters = jest.fn()

      const { rerender } = render(
        <RecipeSearch
          categories={mockCategories}
          searchTerm="vainas"
          selectedCategories={[]}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByDisplayValue("vainas")).toBeInTheDocument()

      // Cambiar prop y verificar sincronización
      rerender(
        <RecipeSearch
          categories={mockCategories}
          searchTerm=""
          selectedCategories={[]}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByDisplayValue("")).toBeInTheDocument()
    })
  })

  describe("RecipesClientFilter Component", () => {
    it("should show clear button when filters are active", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={mockRecipes}
          showOnlyMyRecipes={false}
          totalRecipesCount={3}
          searchTerm="vainas"
          selectedCategories={[]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByTestId("clear-all-filters-button")).toBeInTheDocument()
      expect(screen.getByText("Limpiar filtros")).toBeInTheDocument()
    })

    it("should not show clear button when no filters are active", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={mockRecipes}
          showOnlyMyRecipes={false}
          totalRecipesCount={3}
          searchTerm=""
          selectedCategories={[]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.queryByTestId("clear-all-filters-button")).not.toBeInTheDocument()
    })

    it("should call onClearFilters when clear button is clicked", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={mockRecipes}
          showOnlyMyRecipes={false}
          totalRecipesCount={3}
          searchTerm="vainas"
          selectedCategories={[1]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      const clearButton = screen.getByTestId("clear-all-filters-button")
      fireEvent.click(clearButton)

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
    })

    it("should filter recipes correctly based on search term", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={mockRecipes}
          showOnlyMyRecipes={false}
          totalRecipesCount={3}
          searchTerm="vainas"
          selectedCategories={[]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      // Debe mostrar solo las recetas que contienen "vainas"
      expect(screen.getByTestId("recipe-1")).toBeInTheDocument() // Huevos con vainas
      expect(screen.getByTestId("recipe-3")).toBeInTheDocument() // Ensalada de vainas
      expect(screen.queryByTestId("recipe-2")).not.toBeInTheDocument() // Pasta con tomate
    })

    it("should show correct recipe count in badge", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={mockRecipes}
          showOnlyMyRecipes={false}
          totalRecipesCount={3}
          searchTerm="vainas"
          selectedCategories={[]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByText("Mostrando 2 recetas")).toBeInTheDocument()
    })
  })

  describe("RecipesPageClient Integration", () => {
    it("should clear all filters when clear button is clicked", async () => {
      render(
        <RecipesPageClient
          recipes={mockRecipes}
          categories={mockCategories}
          totalRecipesCount={3}
          showOnlyMyRecipes={false}
        />,
      )

      // Escribir en el campo de búsqueda
      const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")
      fireEvent.change(searchInput, { target: { value: "vainas" } })

      // Verificar que aparecen los filtros activos
      await waitFor(() => {
        expect(screen.getByText("Filtros activos:")).toBeInTheDocument()
        expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()
      })

      // Verificar que aparece el botón de limpiar
      const clearButton = screen.getByTestId("clear-all-filters-button")
      expect(clearButton).toBeInTheDocument()

      // Hacer clic en limpiar
      fireEvent.click(clearButton)

      // Verificar que se limpia todo
      await waitFor(() => {
        expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
        expect(screen.queryByText('Búsqueda: "vainas"')).not.toBeInTheDocument()
        expect(screen.queryByTestId("clear-all-filters-button")).not.toBeInTheDocument()
      })

      // Verificar que el input está vacío
      expect(searchInput).toHaveValue("")
    })

    it("should filter and clear categories correctly", async () => {
      render(
        <RecipesPageClient
          recipes={mockRecipes}
          categories={mockCategories}
          totalRecipesCount={3}
          showOnlyMyRecipes={false}
        />,
      )

      // Seleccionar una categoría
      const desayunoCheckbox = screen.getByLabelText(/Desayuno/)
      fireEvent.click(desayunoCheckbox)

      // Verificar que aparecen los filtros activos
      await waitFor(() => {
        expect(screen.getByText("Filtros activos:")).toBeInTheDocument()
        expect(screen.getByText("Categorías: 1 seleccionada(s)")).toBeInTheDocument()
      })

      // Verificar que solo se muestra la receta de desayuno
      expect(screen.getByTestId("recipe-1")).toBeInTheDocument()
      expect(screen.queryByTestId("recipe-2")).not.toBeInTheDocument()
      expect(screen.queryByTestId("recipe-3")).not.toBeInTheDocument()

      // Limpiar filtros
      const clearButton = screen.getByTestId("clear-all-filters-button")
      fireEvent.click(clearButton)

      // Verificar que se muestran todas las recetas
      await waitFor(() => {
        expect(screen.getByTestId("recipe-1")).toBeInTheDocument()
        expect(screen.getByTestId("recipe-2")).toBeInTheDocument()
        expect(screen.getByTestId("recipe-3")).toBeInTheDocument()
      })

      // Verificar que el checkbox está desmarcado
      expect(desayunoCheckbox).not.toBeChecked()
    })

    it("should handle combined search and category filters", async () => {
      render(
        <RecipesPageClient
          recipes={mockRecipes}
          categories={mockCategories}
          totalRecipesCount={3}
          showOnlyMyRecipes={false}
        />,
      )

      // Escribir búsqueda y seleccionar categoría
      const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")
      fireEvent.change(searchInput, { target: { value: "vainas" } })

      const desayunoCheckbox = screen.getByLabelText(/Desayuno/)
      fireEvent.click(desayunoCheckbox)

      // Verificar filtros combinados
      await waitFor(() => {
        expect(screen.getByText('Búsqueda: "vainas"')).toBeInTheDocument()
        expect(screen.getByText("Categorías: 1 seleccionada(s)")).toBeInTheDocument()
      })

      // Solo debe mostrar "Huevos con vainas" (desayuno + contiene vainas)
      expect(screen.getByTestId("recipe-1")).toBeInTheDocument()
      expect(screen.queryByTestId("recipe-2")).not.toBeInTheDocument()
      expect(screen.queryByTestId("recipe-3")).not.toBeInTheDocument()

      // Limpiar todo
      const clearButton = screen.getByTestId("clear-all-filters-button")
      fireEvent.click(clearButton)

      // Verificar limpieza completa
      await waitFor(() => {
        expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
        expect(searchInput).toHaveValue("")
        expect(desayunoCheckbox).not.toBeChecked()
      })

      // Todas las recetas deben estar visibles
      expect(screen.getByTestId("recipe-1")).toBeInTheDocument()
      expect(screen.getByTestId("recipe-2")).toBeInTheDocument()
      expect(screen.getByTestId("recipe-3")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty recipes array", () => {
      const mockOnClearFilters = jest.fn()

      render(
        <RecipesClientFilter
          recipes={[]}
          showOnlyMyRecipes={false}
          totalRecipesCount={0}
          searchTerm="vainas"
          selectedCategories={[]}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByText("No se encontraron recetas con los criterios seleccionados.")).toBeInTheDocument()
    })

    it("should handle empty categories array", () => {
      const mockOnFiltersChange = jest.fn()
      const mockOnClearFilters = jest.fn()

      render(
        <RecipeSearch
          categories={[]}
          searchTerm=""
          selectedCategories={[]}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />,
      )

      expect(screen.getByText("No hay categorías disponibles.")).toBeInTheDocument()
    })

    it("should handle special characters in search", async () => {
      render(
        <RecipesPageClient
          recipes={mockRecipes}
          categories={mockCategories}
          totalRecipesCount={3}
          showOnlyMyRecipes={false}
        />,
      )

      const searchInput = screen.getByPlaceholderText("Buscar por nombre o ingrediente...")
      fireEvent.change(searchInput, { target: { value: "ñáéíóú" } })

      await waitFor(() => {
        expect(screen.getByText('Búsqueda: "ñáéíóú"')).toBeInTheDocument()
      })

      const clearButton = screen.getByTestId("clear-all-filters-button")
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(searchInput).toHaveValue("")
        expect(screen.queryByText("Filtros activos:")).not.toBeInTheDocument()
      })
    })
  })
})
