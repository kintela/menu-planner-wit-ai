import { render, screen, waitFor } from "@testing-library/react"
import { WeeklyMenuView } from "@/components/weekly-menu-view"
import { supabase } from "@/lib/supabase/client"
import jest from "jest" // Import jest to declare the variable

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(),
  },
}))

// Mock useToast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("WeeklyMenuView Connection Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render interface even with complete database failure", async () => {
    // Mock complete database failure
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockRejectedValue(new Error("Database connection failed")),
      }),
    } as any)

    render(<WeeklyMenuView userId="test-user" />)

    // Should show loading first
    expect(screen.getByText("Cargando planificador de menús...")).toBeInTheDocument()

    // Should render interface after timeout
    await waitFor(
      () => {
        expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
      },
      { timeout: 4000 },
    )

    // Should show all days
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Martes")).toBeInTheDocument()
    expect(screen.getByText("Domingo")).toBeInTheDocument()

    // Should show warning about connection issues
    expect(screen.getByText(/Algunos datos no se pudieron cargar correctamente/)).toBeInTheDocument()
  })

  it("should handle partial success (recipes load, menu fails)", async () => {
    // Mock recipes success, menu failure
    mockSupabase.from.mockImplementation((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: "1", name: "Test Recipe 1" },
                { id: "2", name: "Test Recipe 2" },
              ],
              error: null,
            }),
          }),
        } as any
      }
      // weekly_menus and menu_items fail
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockRejectedValue(new Error("Menu query failed")),
              }),
            }),
          }),
        }),
      } as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
    })

    // Should show recipes section
    expect(screen.getByText("Mis Recetas Disponibles (2)")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 1")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 2")).toBeInTheDocument()

    // Should show warning
    expect(screen.getByText(/Algunos datos no se pudieron cargar correctamente/)).toBeInTheDocument()
  })

  it("should handle complete success", async () => {
    // Mock all queries success
    mockSupabase.from.mockImplementation((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ id: "1", name: "Test Recipe" }],
              error: null,
            }),
          }),
        } as any
      }
      if (table === "weekly_menus") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
    })

    // Should show recipes
    expect(screen.getByText("Mis Recetas Disponibles (1)")).toBeInTheDocument()

    // Should NOT show warning (no connection issues)
    expect(screen.queryByText(/Algunos datos no se pudieron cargar correctamente/)).not.toBeInTheDocument()
  })

  it("should show empty state when no recipes", async () => {
    // Mock empty recipes
    mockSupabase.from.mockImplementation((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText("No hay recetas disponibles")).toBeInTheDocument()
    })

    expect(screen.getByText("Crear primera receta")).toBeInTheDocument()
  })

  it("should handle loading timeout", async () => {
    // Mock queries that never resolve
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
      }),
    } as any)

    render(<WeeklyMenuView userId="test-user" />)

    // Should show loading initially
    expect(screen.getByText("Cargando planificador de menús...")).toBeInTheDocument()

    // Should render interface after timeout
    await waitFor(
      () => {
        expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
      },
      { timeout: 4000 },
    )

    // Should show all days even with timeout
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Domingo")).toBeInTheDocument()
  })
})
