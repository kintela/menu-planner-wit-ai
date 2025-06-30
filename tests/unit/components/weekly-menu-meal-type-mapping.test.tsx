import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("WeeklyMenuView - Meal Type Mapping", () => {
  const mockRecipes = [
    { id: "1", name: "Paella Valenciana", description: "Traditional Spanish rice dish" },
    { id: "2", name: "Gazpacho", description: "Cold tomato soup" },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should map lunch to 'comida' when adding recipe to menu", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "menu-item-1",
            weekly_menu_id: "menu-1",
            recipe_id: "1",
            day_of_week: 0,
            meal_type: "comida",
            dish_order: 0,
            recipe: mockRecipes[0],
          },
          error: null,
        }),
      }),
    })

    // Mock successful recipe loading
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
      }
      if (table === "weekly_menus") {
        if (mockInsert.mock.calls.length === 0) {
          // First call - no existing menu
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
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "menu-1",
                    name: "Menú del 30/6/2025 al 6/7/2025",
                    start_date: "2025-06-30",
                    end_date: "2025-07-06",
                    user_id: "test-user",
                    is_saved: false,
                  },
                  error: null,
                }),
              }),
            }),
          } as any
        } else {
          // Subsequent calls - menu exists
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: {
                        id: "menu-1",
                        name: "Menú del 30/6/2025 al 6/7/2025",
                        start_date: "2025-06-30",
                        end_date: "2025-07-06",
                        user_id: "test-user",
                        is_saved: false,
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          } as any
        }
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
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const user = userEvent.setup()
    render(<WeeklyMenuView userId="test-user" />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()
    })

    // Find the first "Primer plato" selector (Monday lunch)
    const selectors = screen.getAllByText("Añadir receta")
    const firstSelector = selectors[0]

    // Click to open the selector
    await user.click(firstSelector)

    // Wait for options to appear and select Paella
    await waitFor(() => {
      expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()
    })

    const paellaOption = screen.getByText("Paella Valenciana")
    await user.click(paellaOption)

    // Verify that insert was called with correct meal_type mapping
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        weekly_menu_id: "menu-1",
        recipe_id: "1",
        day_of_week: 0,
        meal_type: "comida", // Should be "comida", not "lunch"
        dish_order: 0,
      })
    })
  })

  it("should map dinner to 'cena' when adding recipe to menu", async () => {
    const mockInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: "menu-item-2",
            weekly_menu_id: "menu-1",
            recipe_id: "2",
            day_of_week: 0,
            meal_type: "cena",
            dish_order: 0,
            recipe: mockRecipes[1],
          },
          error: null,
        }),
      }),
    })

    // Mock successful recipe loading and existing menu
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
      }
      if (table === "weekly_menus") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: "menu-1",
                      name: "Menú del 30/6/2025 al 6/7/2025",
                      start_date: "2025-06-30",
                      end_date: "2025-07-06",
                      user_id: "test-user",
                      is_saved: false,
                    },
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
          insert: mockInsert,
        } as any
      }
      return {} as any
    })

    const user = userEvent.setup()
    render(<WeeklyMenuView userId="test-user" />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Gazpacho")).toBeInTheDocument()
    })

    // Find a "Cena" selector (should be the 3rd selector - after 2 lunch dishes)
    const selectors = screen.getAllByText("Añadir receta")
    const dinnerSelector = selectors[2] // Third selector should be dinner

    // Click to open the selector
    await user.click(dinnerSelector)

    // Wait for options to appear and select Gazpacho
    await waitFor(() => {
      expect(screen.getAllByText("Gazpacho")).toHaveLength(2) // One in recipes list, one in selector
    })

    const gazpachoOptions = screen.getAllByText("Gazpacho")
    const gazpachoOption = gazpachoOptions[1] // The one in the selector dropdown
    await user.click(gazpachoOption)

    // Verify that insert was called with correct meal_type mapping
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        weekly_menu_id: "menu-1",
        recipe_id: "2",
        day_of_week: 0,
        meal_type: "cena", // Should be "cena", not "dinner"
        dish_order: 0,
      })
    })
  })

  it("should display recipes correctly after adding them", async () => {
    // Mock successful operations
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
      }
      if (table === "weekly_menus") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: "menu-1",
                      name: "Menú del 30/6/2025 al 6/7/2025",
                      start_date: "2025-06-30",
                      end_date: "2025-07-06",
                      user_id: "test-user",
                      is_saved: false,
                    },
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
                    data: [
                      {
                        id: "menu-item-1",
                        weekly_menu_id: "menu-1",
                        recipe_id: "1",
                        day_of_week: 0,
                        meal_type: "comida",
                        dish_order: 0,
                        recipe: mockRecipes[0],
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: "menu-item-1",
                  weekly_menu_id: "menu-1",
                  recipe_id: "1",
                  day_of_week: 0,
                  meal_type: "comida",
                  dish_order: 0,
                  recipe: mockRecipes[0],
                },
                error: null,
              }),
            }),
          }),
        } as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    // Wait for component to load with existing menu item
    await waitFor(() => {
      expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()
    })

    // Should show the recipe in the menu grid
    expect(screen.getByText("Lunes")).toBeInTheDocument()
    expect(screen.getByText("Comida")).toBeInTheDocument()

    // Should show recipes in the available recipes section
    expect(screen.getByText("Mis Recetas Disponibles (2)")).toBeInTheDocument()
  })
})
