export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: "easy" | "medium" | "hard"
  category?: string
  tags?: string[]
  image_url?: string
  source_url?: string
  user_id: string
  created_at: string
  updated_at: string
  calories_per_serving?: number
  rating?: number
  is_public?: boolean
}

export interface WeeklyMenu {
  id: string
  name: string
  start_date: string
  end_date: string
  user_id: string
  created_at: string
  updated_at: string
  is_saved: boolean
}

export interface MenuItem {
  id: string
  weekly_menu_id: string
  recipe_id: string
  day_of_week: number // 0 = Monday, 6 = Sunday
  meal_type: "lunch" | "dinner"
  dish_order: number
  created_at: string
  recipe?: Recipe
}

export interface UserProfile {
  id: string
  user_id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: "user" | "admin"
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description?: string
  created_at: string
}
