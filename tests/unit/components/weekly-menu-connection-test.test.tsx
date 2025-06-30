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

    // Should show loading initially
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
    expect(screen.getByText("Miércoles")).toBeInTheDocument()
    expect(screen.getByText("Jueves")).toBeInTheDocument()
    expect(screen.getByText("Viernes")).toBeInTheDocument()
    expect(screen.getByText("Sábado")).toBeInTheDocument()
    expect(screen.getByText("Domingo")).toBeInTheDocument()

    // Should show connection issues warning
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
      } else {
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
      }
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
    })

    // Should show recipes loaded
    expect(screen.getByText("Mis Recetas Disponibles (2)")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 1")).toBeInTheDocument()
    expect(screen.getByText("Test Recipe 2")).toBeInTheDocument()

    // Should show connection issues warning
    expect(screen.getByText(/Algunos datos no se pudieron cargar correctamente/)).toBeInTheDocument()
  })

  it("should handle complete success", async () => {
    // Mock complete success
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
      } else if (table === "weekly_menus") {
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
      return {} as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Menú/)).toBeInTheDocument()
    })

    // Should NOT show connection issues warning
    expect(screen.queryByText(/Algunos datos no se pudieron cargar correctamente/)).not.toBeInTheDocument()

    // Should show recipes
    expect(screen.getByText("Mis Recetas Disponibles (1)")).toBeInTheDocument()
  })

  it("should handle no recipes scenario", async () => {
    // Mock no recipes
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
      } else {
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
    })

    render(<WeeklyMenuView userId="test-user" />)

    await waitFor(() => {
      expect(screen.getByText("No hay recetas disponibles")).toBeInTheDocument()
    })

    // Should show create recipe button
    expect(screen.getByText("Crear primera receta")).toBeInTheDocument()

    // Selectors should be disabled
    const selectors = screen.getAllByText("No hay recetas")
    expect(selectors.length).toBeGreaterThan(0)
  })

  it("should handle loading timeout", async () => {
    // Mock hanging requests
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

    // Should show all days even with hanging requests
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Domingo")).toBeInTheDocument()
  })
})
