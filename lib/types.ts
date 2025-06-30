export interface Recipe {
  id: number
  name: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: string
  category: string
  image_url?: string
  source_url?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface WeeklyMenu {
  id: number
  name: string
  start_date: string
  end_date: string
  user_id: string
  is_saved: boolean
  saved_at?: string
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: "comida" | "cena"
  dish_order: number
  recipe?: Recipe
  created_at: string
}

export interface DayMenu {
  day: number
  dayName: string
  date: string
  meals: {
    comida: (Recipe | null)[]
    cena: Recipe | null
  }
}

export interface UserProfile {
  id: string
  role: string
  full_name?: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}
