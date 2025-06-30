export interface Recipe {
  id: string
  name: string
  title?: string
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
  created_at: string
  updated_at: string
  user_id: string
}

export interface WeeklyMenu {
  id: string
  user_id: string
  week_start: string
  meals: {
    [key: string]: {
      lunch?: Recipe
      dinner?: Recipe
    }
  }
  created_at: string
  updated_at: string
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
