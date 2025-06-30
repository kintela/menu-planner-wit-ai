export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: string[]
  instructions: string[]
  prep_time?: number
  cook_time?: number
  servings?: number
  difficulty?: string
  category?: string
  image_url?: string
  source_url?: string
  created_at: string
  updated_at: string
  user_id: string
  is_public: boolean
  rating?: number
  tags?: string[]
  calories_per_serving?: number
  nutrition_info?: {
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
  }
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
  day_of_week: number // 0 = Monday, 6 = Sunday
  meal_type: "lunch" | "dinner"
  dish_order: number
  notes?: string
  created_at: string
  recipe?: Recipe
}

export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  user_id: string
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
