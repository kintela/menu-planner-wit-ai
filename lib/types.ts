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
  id: string // Esta es la columna correcta que coincide con auth.users.id
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  role: "admin" | "user_full" | "user_restricted"
  created_at: string
  updated_at: string
}

export type UserRole = "admin" | "user_full" | "user_restricted"

export interface Category {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface RecipeSearchFilters {
  query?: string
  category?: string
  difficulty?: string
  maxPrepTime?: number
  maxCookTime?: number
  minRating?: number
  tags?: string[]
  myRecipesOnly?: boolean
}

export interface AIRecipeSuggestion {
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: number
  cook_time: number
  servings: number
  difficulty: string
  category: string
  tags: string[]
  calories_per_serving?: number
}
