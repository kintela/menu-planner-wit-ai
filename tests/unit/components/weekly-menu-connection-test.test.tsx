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

describe("WeeklyMenuView - Connection Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should render component even when database queries fail", async () => {
    // Mock all database calls to fail
    const mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          resolves: Promise.reject(new Error("Database connection failed")),
        }),
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: new Error("Connection failed"),
          }),
        }),
      }),
    })

    mockSupabase.from.mockImplementation(mockFrom)

    render(<WeeklyMenuView userId="test-user-id" />)

    // Should show loading initially
    expect(screen.getByText(/cargando/i)).toBeInTheDocument()

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument()
    })

    // Should render the weekly menu interface even with errors
    expect(screen.getByText(/nuevo menú/i)).toBeInTheDocument()
    expect(screen.getByText(/lunes/i)).toBeInTheDocument()
    expect(screen.getByText(/martes/i)).toBeInTheDocument()
    expect(screen.getByText(/miércoles/i)).toBeInTheDocument()
    expect(screen.getByText(/jueves/i)).toBeInTheDocument()
    expect(screen.getByText(/viernes/i)).toBeInTheDocument()
    expect(screen.getByText(/sábado/i)).toBeInTheDocument()
    expect(screen.getByText(/domingo/i)).toBeInTheDocument()

    // Should show message about no recipes
    expect(screen.getByText(/no hay recetas disponibles/i)).toBeInTheDocument()
    expect(screen.getByText(/crear primera receta/i)).toBeInTheDocument()
  })

  it("should handle partial failures gracefully", async () => {
    // Mock recipes to fail but weekly_menus to succeed
    const mockFrom = jest
      .fn()
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: new Error("Recipes failed"),
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
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
      }))

    mockSupabase.from.mockImplementation(mockFrom)

    render(<WeeklyMenuView userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument()
    })

    // Should still render the interface
    expect(screen.getByText(/nuevo menú/i)).toBeInTheDocument()
    expect(screen.getByText(/no hay recetas disponibles/i)).toBeInTheDocument()
  })

  it("should show success state when data loads correctly", async () => {
    const mockRecipes = [
      { id: "1", name: "Paella", description: "Delicious paella", category: "Main" },
      { id: "2", name: "Gazpacho", description: "Cold soup", category: "Starter" },
    ]

    const mockFrom = jest
      .fn()
      .mockImplementationOnce(() => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockRecipes,
            error: null,
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
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
      }))

    mockSupabase.from.mockImplementation(mockFrom)

    render(<WeeklyMenuView userId="test-user-id" />)

    await waitFor(() => {
      expect(screen.queryByText(/cargando/i)).not.toBeInTheDocument()
    })

    // Should show recipes
    expect(screen.getByText(/mis recetas disponibles $$2$$/i)).toBeInTheDocument()
    expect(screen.getByText("Paella")).toBeInTheDocument()
    expect(screen.getByText("Gazpacho")).toBeInTheDocument()

    // Should show selectors enabled
    const selectors = screen.getAllByText(/añadir receta/i)
    expect(selectors.length).toBeGreaterThan(0)
  })
})
