export interface Recipe {
  id: number
  name: string
  ingredients: string
  preparation: string
  image_url?: string
  created_at: string
  is_ai_generated?: boolean
  video_url?: string
  source_url?: string
  calories?: number
  user_id?: string // Añadido para la relación con el usuario
  categories?: Category[]
}

export interface Category {
  id: number
  name: string
  created_at: string
}

export interface WeeklyMenu {
  id: number
  name: string
  start_date: string
  end_date: string
  created_at: string
  user_id: string
}

export interface MenuItem {
  id: number
  weekly_menu_id: number
  recipe_id: number
  day_of_week: number
  meal_type: string
  dish_order: number
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  role: "admin" | "user" | "user_restricted"
  created_at: string
  updated_at: string
}
