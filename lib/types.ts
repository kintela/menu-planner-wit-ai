export interface Recipe {
  id: string
  title: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  category?: string
  difficulty?: string
  image_url?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface WeeklyMenu {
  id: string
  name: string
  start_date: string
  end_date: string
  user_id: string
  is_saved: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  weekly_menu_id: string
  recipe_id: string
  day_of_week: number
  meal_type: string
  dish_order: number
  recipe?: Recipe
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  role: string
  created_at: string
  updated_at: string
}
