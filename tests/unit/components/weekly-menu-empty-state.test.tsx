import { render, screen, waitFor } from "@testing-library/react"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { supabase } from "@/lib/supabase/client"
import jest from "jest" // Import jest to declare the variable

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(),
              order: jest.fn(() => ({
                order: jest.fn(() => ({
                  order: jest.fn(),
                })),
              })),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}))

// Mock useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("WeeklyMenuView - Empty State", () => {
  const mockUserId = "test-user-id"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should show empty menu form when no weekly menu exists", async () => {
    // Mock: No weekly menu exists
    const mockWeeklyMenuQuery = {
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    // Mock: Recipes exist
    const mockRecipesQuery = {
      order: jest.fn().mockResolvedValue({
        data: [
          { id: "1", name: "Test Recipe 1", description: "Test description", category: "Test Category" },
          { id: "2", name: "Test Recipe 2", description: "Another description", category: "Another Category" },
        ],
        error: null,
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_menus") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => mockWeeklyMenuQuery),
              })),
            })),
          })),
        } as any
      }
      if (table === "recipes") {
        return {
          select: jest.fn(() => mockRecipesQuery),
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Guardando...")).not.toBeInTheDocument()
    })

    // Should show "Nuevo Menú" title
    expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()

    // Should show all days of the week
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Martes")).toBeInTheDocument()
    expect(screen.getByText("Miércoles")).toBeInTheDocument()
    expect(screen.getByText("Jueves")).toBeInTheDocument()
    expect(screen.getByText("Viernes")).toBeInTheDocument()
    expect(screen.getByText("Sábado")).toBeInTheDocument()
    expect(screen.getByText("Domingo")).toBeInTheDocument()

    // Should show meal types
    expect(screen.getAllByText("Comida")).toHaveLength(7) // One for each day
    expect(screen.getAllByText("Cena")).toHaveLength(7) // One for each day

    // Should show dish labels
    expect(screen.getAllByText("Primer plato")).toHaveLength(7)
    expect(screen.getAllByText("Segundo plato")).toHaveLength(7)
    expect(screen.getAllByText("Plato único")).toHaveLength(7)

    // Should show recipe selectors
    expect(screen.getAllByText("Añadir receta")).toHaveLength(21) // 7 days × 3 dishes

    // Should show available recipes
    expect(screen.getByText("Mis Recetas Disponibles (2)")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 1")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 2")).toBeInTheDocument()

    // Should show save button (disabled since no menu exists yet)
    expect(screen.getByText("Guardar Menú")).toBeInTheDocument()
  })

  it("should not fail when no menu items exist", async () => {
    // Mock: No weekly menu exists, so no menu items query should be made
    const mockWeeklyMenuQuery = {
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    const mockRecipesQuery = {
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_menus") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => mockWeeklyMenuQuery),
              })),
            })),
          })),
        } as any
      }
      if (table === "recipes") {
        return {
          select: jest.fn(() => mockRecipesQuery),
        } as any
      }
      // menu_items table should not be queried when no weekly menu exists
      if (table === "menu_items") {
        throw new Error("menu_items should not be queried when no weekly menu exists")
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Guardando...")).not.toBeInTheDocument()
    })

    // Should not show any error
    expect(screen.queryByText(/Error/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument()

    // Should show empty state correctly
    expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
  })

  it("should handle recipe loading errors gracefully", async () => {
    // Mock: No weekly menu exists
    const mockWeeklyMenuQuery = {
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    // Mock: Recipe loading fails
    const mockRecipesQuery = {
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Failed to fetch recipes" },
      }),
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_menus") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => mockWeeklyMenuQuery),
              })),
            })),
          })),
        } as any
      }
      if (table === "recipes") {
        return {
          select: jest.fn(() => mockRecipesQuery),
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar los datos del menú semanal/)).toBeInTheDocument()
    })

    // Should show error message
    expect(screen.getByText("Reintentar")).toBeInTheDocument()
  })
})
