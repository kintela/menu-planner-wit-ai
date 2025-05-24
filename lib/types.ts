export type Recipe = {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url: string | null
  video_url: string | null
  source_url: string | null
  is_ai_generated: boolean
  calories: number | null
  created_at: string
  categories?: Category[]
}

export type Category = {
  id: number
  name: string
  created_at: string
  recipeCount?: number
}

export type WeeklyMenu = {
  id: number
  name: string | null
  start_date: string
  end_date: string
  created_at: string
  is_saved: boolean
  saved_at: string | null
  menu_items?: MenuItem[]
}

export type MenuItem = {
  id: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: "comida" | "cena"
  dish_order: number
  recipe?: Recipe
}

export type DayMenu = {
  day: number
  dayName: string
  date: string
  meals: {
    comida: Recipe[] // Ahora es un array para múltiples platos
    cena: Recipe | null // Sigue siendo un solo plato
  }
}
