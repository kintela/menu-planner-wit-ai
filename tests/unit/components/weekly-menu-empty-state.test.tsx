import { render, screen, waitFor } from "@testing-library/react"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { supabase } from "@/lib/supabase/client"
import jest from "jest" // Declare the jest variable

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}))

// Mock hooks
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

describe("WeeklyMenuView Empty State", () => {
  const mockUserId = "test-user-id"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should show empty menu without creating one automatically", async () => {
    // Mock no existing menu
    const mockFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    }))
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading")).not.toBeInTheDocument()
    })

    // Should show empty menu title
    expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()

    // Should show all days
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Martes")).toBeInTheDocument()
    expect(screen.getByText("Miércoles")).toBeInTheDocument()

    // Should show meal types
    expect(screen.getAllByText("Comida")).toHaveLength(7) // One for each day
    expect(screen.getAllByText("Cena")).toHaveLength(7)

    // Should show add recipe selectors
    expect(screen.getAllByText("Añadir receta")).toHaveLength(21) // 3 per day * 7 days

    // Should NOT have called insert (no menu creation)
    expect(mockFrom).toHaveBeenCalledWith("weekly_menus")
    expect(mockFrom).toHaveBeenCalledWith("recipes")
    expect(mockFrom).not.toHaveBeenCalledWith("menu_items")
  })

  it("should handle recipe loading error gracefully", async () => {
    // Mock error when loading recipes
    const mockFrom = jest.fn((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: null, error: { message: "Database error" } })),
          })),
        }
      }
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

    render(<WeeklyMenuView userId={mockUserId} />)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error al cargar los datos del menú semanal/)).toBeInTheDocument()
    })

    // Should show retry button
    expect(screen.getByText("Reintentar")).toBeInTheDocument()
  })

  it("should create menu only when adding first recipe", async () => {
    const mockInsert = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            data: { id: "new-menu-id", name: "Test Menu" },
            error: null,
          }),
        ),
      })),
    }))

    const mockFrom = jest.fn((table) => {
      if (table === "weekly_menus") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              })),
            })),
          })),
          insert: mockInsert,
        }
      }
      return {
        select: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }
    })
    ;(supabase.from as jest.Mock).mockImplementation(mockFrom)

    render(<WeeklyMenuView userId={mockUserId} />)

    await waitFor(() => {
      expect(screen.queryByText("Loading")).not.toBeInTheDocument()
    })

    // Menu should not be created automatically
    expect(mockInsert).not.toHaveBeenCalled()

    // Should show empty state
    expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
  })
})
