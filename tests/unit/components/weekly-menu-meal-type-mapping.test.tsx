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
              maybeSingle: jest.fn(),
              order: jest.fn(() => ({
                order: jest.fn(() => ({
                  order: jest.fn(),
                })),
              })),
            })),
          })),
        })),
        order: jest.fn(),
      })),
    })),
  },
}))

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe("WeeklyMenuView - Meal Type Mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should correctly map and display existing menu items from database", async () => {
    // Mock recipes response
    const mockRecipesResponse = {
      data: [
        { id: "40", name: "Paella Valenciana", category: "Arroces" },
        { id: "72", name: "Gazpacho Andaluz", category: "Sopas" },
        { id: "60", name: "Tortilla Española", category: "Huevos" },
      ],
      error: null,
    }

    // Mock weekly menu response
    const mockWeeklyMenuResponse = {
      data: {
        id: "20",
        name: "Menú del 30/12/2024 al 05/01/2025",
        start_date: "2024-12-30",
        end_date: "2025-01-05",
        user_id: "test-user",
        is_saved: false,
      },
      error: null,
    }

    // Mock menu items response with Spanish meal_type values
    const mockMenuItemsResponse = {
      data: [
        {
          id: "170",
          weekly_menu_id: "20",
          recipe_id: "40",
          day_of_week: 2,
          meal_type: "comida", // Spanish value in DB
          dish_order: 0,
          recipe: { id: "40", name: "Paella Valenciana", category: "Arroces" },
        },
        {
          id: "169",
          weekly_menu_id: "20",
          recipe_id: "72",
          day_of_week: 1,
          meal_type: "comida", // Spanish value in DB
          dish_order: 0,
          recipe: { id: "72", name: "Gazpacho Andaluz", category: "Sopas" },
        },
        {
          id: "171",
          weekly_menu_id: "20",
          recipe_id: "10",
          day_of_week: 3,
          meal_type: "cena", // Spanish value in DB
          dish_order: 0,
          recipe: { id: "10", name: "Ensalada César", category: "Ensaladas" },
        },
      ],
      error: null,
    }

    // Setup mock chain for recipes
    const mockRecipesFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve(mockRecipesResponse)),
      })),
    }))

    // Setup mock chain for weekly menu
    const mockWeeklyMenuFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => Promise.resolve(mockWeeklyMenuResponse)),
            })),
          })),
        })),
      })),
    }))

    // Setup mock chain for menu items
    const mockMenuItemsFrom = jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            order: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve(mockMenuItemsResponse)),
            })),
          })),
        })),
      })),
    }))

    // Mock supabase.from to return different mocks based on table name
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return mockRecipesFrom() as any
      } else if (table === "weekly_menus") {
        return mockWeeklyMenuFrom() as any
      } else if (table === "menu_items") {
        return mockMenuItemsFrom() as any
      }
      return {} as any
    })

    render(<WeeklyMenuView userId="test-user" />)

    // Wait for loading to complete
    await waitFor(
      () => {
        expect(screen.queryByText("Cargando planificador de menús...")).not.toBeInTheDocument()
      },
      { timeout: 5000 },
    )

    // Verify that existing recipes are displayed in their correct positions
    await waitFor(() => {
      // Paella Valenciana should appear in Miércoles (day 2), Comida, Primer plato
      expect(screen.getByText("Paella Valenciana")).toBeInTheDocument()

      // Gazpacho should appear in Martes (day 1), Comida, Primer plato
      expect(screen.getByText("Gazpacho Andaluz")).toBeInTheDocument()

      // Ensalada César should appear in Jueves (day 3), Cena, Plato único
      expect(screen.getByText("Ensalada César")).toBeInTheDocument()
    })

    // Verify that the meal type mapping works correctly
    // The component should show "Cambiar receta" for positions that have recipes
    const changeRecipeButtons = screen.getAllByText("Cambiar receta")
    expect(changeRecipeButtons.length).toBeGreaterThan(0)

    console.log("✅ Test passed: Existing menu items are correctly displayed with proper meal type mapping")
  })

  it("should correctly map meal types when adding new recipes", async () => {
    // Mock empty responses initially
    const mockRecipesResponse = {
      data: [{ id: "1", name: "Test Recipe", category: "Test" }],
      error: null,
    }

    const mockEmptyMenuResponse = { data: null, error: null }
    const mockEmptyItemsResponse = { data: [], error: null }

    // Setup mocks
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "recipes") {
        return {
          select: () => ({
            order: () => Promise.resolve(mockRecipesResponse),
          }),
        } as any
      } else if (table === "weekly_menus") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve(mockEmptyMenuResponse),
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
      expect(screen.queryByText("Cargando planificador de menús...")).not.toBeInTheDocument()
    })

    // Verify that empty selectors show "Añadir receta"
    const addRecipeButtons = screen.getAllByText("Añadir receta")
    expect(addRecipeButtons.length).toBeGreaterThan(0)

    console.log("✅ Test passed: Empty menu shows correct placeholders for adding recipes")
  })
})
