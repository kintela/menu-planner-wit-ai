export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  category?: string
  difficulty?: string
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
    [day: string]: {
      breakfast?: Recipe
      lunch?: Recipe
      dinner?: Recipe
    }
  }
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}
