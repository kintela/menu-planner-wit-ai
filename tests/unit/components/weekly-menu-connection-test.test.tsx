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

describe("WeeklyMenuView - Connection and Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should always render the interface even with complete database failure", async () => {
    // Mock complete database failure
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          then: jest.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      }),
    } as any)

    render(<WeeklyMenuView userId="test-user" />)

    // Should show loading initially
    expect(screen.getByText("Cargando planificador de menús...")).toBeInTheDocument()

    // Should render the interface after loading timeout
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
    const mockRecipes = [
      { id: "1", name: "Paella", description: "Delicious rice dish" },
      { id: "2", name: "Gazpacho", description: "Cold soup" },
    ]

    // Mock recipes success, menu failure
    mockSupabase.from.mockImplementation((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockRecipes,
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
                  maybeSingle: jest.fn().mockRejectedValue(new Error("Menu query failed")),
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

    // Should show recipes
    expect(screen.getByText("Mis Recetas Disponibles (2)")).toBeInTheDocument()
    expect(screen.getByText("Paella")).toBeInTheDocument()
    expect(screen.getByText("Gazpacho")).toBeInTheDocument()

    // Should show connection issues warning
    expect(screen.getByText(/Algunos datos no se pudieron cargar correctamente/)).toBeInTheDocument()
  })

  it("should handle complete success", async () => {
    const mockRecipes = [{ id: "1", name: "Paella", description: "Delicious rice dish" }]

    const mockMenu = {
      id: "menu-1",
      name: "Menú del 30/06/2025 al 06/07/2025",
      start_date: "2025-06-30",
      end_date: "2025-07-06",
      user_id: "test-user",
      is_saved: false,
    }

    // Mock all success
    mockSupabase.from.mockImplementation((table) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockRecipes,
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
                    data: mockMenu,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any
      } else if (table === "menu_items") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [],
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
      expect(screen.getByText(mockMenu.name)).toBeInTheDocument()
    })

    // Should show recipes
    expect(screen.getByText("Mis Recetas Disponibles (1)")).toBeInTheDocument()
    expect(screen.getByText("Paella")).toBeInTheDocument()

    // Should NOT show connection issues warning
    expect(screen.queryByText(/Algunos datos no se pudieron cargar correctamente/)).not.toBeInTheDocument()
  })

  it("should handle no recipes available", async () => {
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

    // Should show no recipes message
    expect(screen.getByText("No hay recetas disponibles")).toBeInTheDocument()
    expect(screen.getByText("Crear primera receta")).toBeInTheDocument()

    // Selectors should be disabled
    const selectors = screen.getAllByText("No hay recetas")
    expect(selectors.length).toBeGreaterThan(0)
  })

  it("should handle loading timeout", async () => {
    // Mock hanging requests
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(
          new Promise(() => {}), // Never resolves
        ),
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
