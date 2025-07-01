// Cliente Supabase con datos de ejemplo para v0
const mockRecipes = [
  {
    id: 1,
    name: "Paella Valenciana",
    ingredients: "Arroz, pollo, conejo, judías verdes, garrofón, tomate, pimiento rojo, azafrán, aceite de oliva, sal",
    preparation:
      "Sofreír las carnes, añadir las verduras, incorporar el arroz y el caldo con azafrán. Cocinar 18 minutos.",
    image_url: "/placeholder.svg?height=300&width=400&text=Paella+Valenciana",
    calories: 450,
    user_id: "user1",
    is_ai_generated: false,
    video_url: "https://youtube.com/watch?v=example1",
    source_url: "https://recetasespanolas.com/paella",
    created_at: "2024-01-15T10:00:00Z",
    user_profiles: {
      full_name: "María García",
      first_name: "María",
    },
    recipe_categories: [{ categories: { id: 2, name: "Almuerzo" } }],
  },
  {
    id: 2,
    name: "Gazpacho Andaluz",
    ingredients: "Tomates maduros, pepino, pimiento verde, cebolla, ajo, pan, aceite de oliva virgen, vinagre, sal",
    preparation: "Triturar todos los ingredientes, colar y enfriar. Servir con guarnición de verduras picadas.",
    image_url: "/placeholder.svg?height=300&width=400&text=Gazpacho+Andaluz",
    calories: 120,
    user_id: "user2",
    is_ai_generated: true,
    created_at: "2024-01-14T15:30:00Z",
    user_profiles: {
      full_name: "Chef AI",
      first_name: "Chef",
    },
    recipe_categories: [{ categories: { id: 1, name: "Desayuno" } }, { categories: { id: 5, name: "Snacks" } }],
  },
  {
    id: 3,
    name: "Tortilla Española",
    ingredients: "Patatas, huevos, cebolla, aceite de oliva, sal",
    preparation: "Freír las patatas y cebolla, batir con huevos y cuajar en la sartén por ambos lados.",
    image_url: "/placeholder.svg?height=300&width=400&text=Tortilla+Española",
    calories: 280,
    user_id: "user1",
    is_ai_generated: false,
    created_at: "2024-01-13T12:00:00Z",
    user_profiles: {
      full_name: "María García",
      first_name: "María",
    },
    recipe_categories: [{ categories: { id: 1, name: "Desayuno" } }, { categories: { id: 2, name: "Almuerzo" } }],
  },
  {
    id: 4,
    name: "Crema Catalana",
    ingredients: "Leche, yemas de huevo, azúcar, maicena, canela, limón, azúcar para quemar",
    preparation:
      "Hervir la leche con canela y limón. Mezclar yemas con azúcar y maicena. Cocinar hasta espesar y quemar azúcar encima.",
    image_url: "/placeholder.svg?height=300&width=400&text=Crema+Catalana",
    calories: 320,
    user_id: "user3",
    is_ai_generated: false,
    video_url: "https://youtube.com/watch?v=example2",
    created_at: "2024-01-12T18:45:00Z",
    user_profiles: {
      full_name: "Josep Martínez",
      first_name: "Josep",
    },
    recipe_categories: [{ categories: { id: 4, name: "Postre" } }],
  },
  {
    id: 5,
    name: "Ensalada Mediterránea",
    ingredients:
      "Lechuga, tomate, pepino, aceitunas negras, queso feta, cebolla roja, aceite de oliva, vinagre balsámico",
    preparation: "Cortar todas las verduras, mezclar con aceitunas y queso feta. Aliñar con aceite y vinagre.",
    image_url: "/placeholder.svg?height=300&width=400&text=Ensalada+Mediterránea",
    calories: 180,
    user_id: "user2",
    is_ai_generated: true,
    created_at: "2024-01-11T14:20:00Z",
    user_profiles: {
      full_name: "Chef AI",
      first_name: "Chef",
    },
    recipe_categories: [{ categories: { id: 2, name: "Almuerzo" } }, { categories: { id: 5, name: "Snacks" } }],
  },
  {
    id: 6,
    name: "Pollo al Ajillo",
    ingredients: "Pollo troceado, ajo, perejil, aceite de oliva, vino blanco, sal, pimienta",
    preparation: "Dorar el pollo, añadir ajo laminado, vino blanco y perejil. Cocinar hasta que esté tierno.",
    image_url: "/placeholder.svg?height=300&width=400&text=Pollo+al+Ajillo",
    calories: 380,
    user_id: "user1",
    is_ai_generated: false,
    created_at: "2024-01-10T19:30:00Z",
    user_profiles: {
      full_name: "María García",
      first_name: "María",
    },
    recipe_categories: [{ categories: { id: 3, name: "Cena" } }],
  },
]

const mockCategories = [
  { id: 1, name: "Desayuno" },
  { id: 2, name: "Almuerzo" },
  { id: 3, name: "Cena" },
  { id: 4, name: "Postre" },
  { id: 5, name: "Snacks" },
]

export const supabase = {
  from: (table: string) => ({
    select: (columns?: string) => {
      const selectQuery = {
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: (column: string, options?: any) => ({
            limit: (count: number) => {
              if (table === "recipes") {
                return Promise.resolve({ data: mockRecipes, error: null })
              }
              return Promise.resolve({ data: [], error: null })
            },
          }),
          limit: (count: number) => {
            if (table === "recipes") {
              return Promise.resolve({ data: mockRecipes, error: null })
            }
            return Promise.resolve({ data: [], error: null })
          },
        }),
        order: (column: string, options?: any) => ({
          limit: (count: number) => {
            if (table === "recipes") {
              return Promise.resolve({ data: mockRecipes, error: null })
            } else if (table === "categories") {
              return Promise.resolve({ data: mockCategories, error: null })
            }
            return Promise.resolve({ data: [], error: null })
          },
        }),
        limit: (count: number) => {
          if (table === "recipes") {
            return Promise.resolve({ data: mockRecipes, error: null })
          } else if (table === "categories") {
            return Promise.resolve({ data: mockCategories, error: null })
          }
          return Promise.resolve({ data: [], error: null })
        },
      }

      // Para consultas directas sin encadenamiento
      if (table === "recipes") {
        return Promise.resolve({ data: mockRecipes, error: null })
      } else if (table === "categories") {
        return Promise.resolve({ data: mockCategories, error: null })
      }

      return selectQuery
    },
    insert: (data: any) => Promise.resolve({ data: null, error: null }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
    }),
  }),
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
}

export function createClient() {
  return supabase
}
