import { createClient } from "@supabase/supabase-js"

// Export createClient function for compatibility
export const createSupabaseClient = () => {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  // Create and export the Supabase client
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Create and export the Supabase client
export const supabase = createSupabaseClient()

// Export getSupabaseClient function for compatibility
export const getSupabaseClient = () => supabase

export default supabase
