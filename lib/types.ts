export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients?: string[]
  instructions?: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  category?: string
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface WeeklyMenu {
  id: string
  name: string
  start_date: string
  end_date: string
  user_id: string
  is_saved: boolean
  created_at?: string
  updated_at?: string
}

export interface MenuItem {
  id: string
  weekly_menu_id: string
  recipe_id: string
  day_of_week: string
  meal_type: string
  dish_order?: number
  recipe?: Recipe
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  email: string
  user_metadata?: {
    avatar_url?: string
    full_name?: string
    name?: string
    picture?: string
  }
}
