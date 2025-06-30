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
  difficulty?: "easy" | "medium" | "hard"
  image_url?: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface UserProfile {
  id: string
  role: string
  full_name: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface WeeklyMenu {
  id: string
  user_id: string
  week_start: string
  meals: {
    [day: string]: {
      lunch?: Recipe
      dinner?: Recipe
    }
  }
  created_at: string
  updated_at: string
}
