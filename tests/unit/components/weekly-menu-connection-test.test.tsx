import { render, screen, waitFor } from "@testing-library/react"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { supabase } from "@/lib/supabase/client"
import jest from "jest"

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("WeeklyMenuView - Connection Test", () => {
  const mockUserId = "test-user-id"

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should handle Supabase connection errors gracefully", async () => {
    // Mock connection test failure
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Connection failed", code: "CONNECTION_ERROR" },
              }),
            ),
            order: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Connection failed", code: "CONNECTION_ERROR" },
              }),
            ),
          })),
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument()
    })

    // Should show connection error message
    expect(screen.getByText(/No se pudo conectar a la base de datos/)).toBeInTheDocument()
    expect(screen.getByText("Reintentar")).toBeInTheDocument()
    expect(screen.getByText(/verifica tu conexión a internet/)).toBeInTheDocument()
  })

  it("should show success message when connection works", async () => {
    // Mock successful connection and data loading
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [{}], error: null })),
            order: jest.fn(() =>
              Promise.resolve({
                data: [{ id: "1", name: "Test Recipe", description: "Test", category: "Test" }],
                error: null,
              }),
            ),
          })),
        } as any
      }
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
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Error")).not.toBeInTheDocument()
    })

    // Should show the menu interface
    expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
    expect(screen.getByText("Mis Recetas Disponibles (1)")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe")).toBeInTheDocument()
  })

  it("should show empty state when no recipes exist", async () => {
    // Mock successful connection but no recipes
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [{}], error: null })),
            order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        } as any
      }
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
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId={mockUserId} />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Error")).not.toBeInTheDocument()
    })

    // Should show empty state
    expect(screen.getByText("No hay recetas disponibles")).toBeInTheDocument()
    expect(screen.getByText("Crear primera receta")).toBeInTheDocument()
  })
})
