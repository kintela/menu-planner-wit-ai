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

describe("WeeklyMenuView - Robust Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should ALWAYS render component even with complete database failure", async () => {
    // Mock all database calls to fail completely
    mockSupabase.from.mockImplementation(() => {
      throw new Error("Complete database failure")
    })

    render(<WeeklyMenuView userId="test-user-id" />)

    // Should show loading initially
    expect(screen.getByText(/cargando planificador/i)).toBeInTheDocument()

    // Wait for loading to complete (max 5 seconds)
    await waitFor(
      () => {
        expect(screen.queryByText(/cargando planificador/i)).not.toBeInTheDocument()
      },
      { timeout: 6000 },
    )

    // Should ALWAYS render the weekly menu interface
    expect(screen.getByText(/nuevo menú/i)).toBeInTheDocument()
    expect(screen.getByText(/lunes/i)).toBeInTheDocument()
    expect(screen.getByText(/martes/i)).toBeInTheDocument()
    expect(screen.getByText(/miércoles/i)).toBeInTheDocument()
    expect(screen.getByText(/jueves/i)).toBeInTheDocument()
    expect(screen.getByText(/viernes/i)).toBeInTheDocument()
    expect(screen.getByText(/sábado/i)).toBeInTheDocument()
    expect(screen.getByText(/domingo/i)).toBeInTheDocument()

    // Should show connection issues warning
    expect(screen.getByText(/algunos datos no se pudieron cargar/i)).toBeInTheDocument()

    // Should show message about no recipes
    expect(screen.getByText(/no hay recetas disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/crear primera receta/i)).toBeInTheDocument()
  })

  it("should handle partial success gracefully", async () => {
    const mockRecipes = [
      { id: "1", name: "Paella", description: "Delicious paella", category: "Main" },
      { id: "2", name: "Gazpacho", description: "Cold soup", category: "Starter" },
    ]

    // Mock recipes to succeed, menu to fail
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockRecipes,
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
                    error: new Error("Menu fetch failed"),
                  }),
                }),
              }),
            }),
          }),
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText(/cargando planificador/i)).not.toBeInTheDocument()
    })

    // Should show recipes even if menu failed
    expect(screen.getByText(/mis recetas disponibles $$2$$/i)).toBeInTheDocument()
    expect(screen.getByText("Paella")).toBeInTheDocument()
    expect(screen.getByText("Gazpacho")).toBeInTheDocument()

    // Should show connection issues warning
    expect(screen.getByText(/algunos datos no se pudieron cargar/i)).toBeInTheDocument()

    // Should show selectors enabled
    const selectors = screen.getAllByText(/añadir receta/i)
    expect(selectors.length).toBeGreaterThan(0)
  })

  it("should show success state when everything works", async () => {
    const mockRecipes = [{ id: "1", name: "Paella", description: "Delicious paella", category: "Main" }]

    const mockMenu = {
      id: "menu-1",
      name: "Menú de prueba",
      start_date: "2025-06-30",
      end_date: "2025-07-06",
      user_id: "test-user-id",
      is_saved: false,
    }

    // Mock all calls to succeed
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockRecipes,
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
                    data: mockMenu,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        } as any
      }
      if (table === "menu_items") {
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

    render(<WeeklyMenuView userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText(/cargando planificador/i)).not.toBeInTheDocument()
    })

    // Should show success state
    expect(screen.getByText("Menú de prueba")).toBeInTheDocument()
    expect(screen.getByText(/mis recetas disponibles $$1$$/i)).toBeInTheDocument()
    expect(screen.getByText("Paella")).toBeInTheDocument()

    // Should NOT show connection issues warning
    expect(screen.queryByText(/algunos datos no se pudieron cargar/i)).not.toBeInTheDocument()
  })

  it("should handle loading timeout", async () => {
    // Mock a hanging promise that never resolves
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
      }),
    }))

    render(<WeeklyMenuView userId="test-user-id" />)

    // Should show loading initially
    expect(screen.getByText(/cargando planificador/i)).toBeInTheDocument()

    // Should stop loading after timeout (5 seconds)
    await waitFor(
      () => {
        expect(screen.queryByText(/cargando planificador/i)).not.toBeInTheDocument()
      },
      { timeout: 6000 },
    )

    // Should render the interface even after timeout
    expect(screen.getByText(/nuevo menú/i)).toBeInTheDocument()
  })
})
