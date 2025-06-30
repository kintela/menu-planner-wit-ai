import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: any = null

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables")
    // Return a mock client for development
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        signUp: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        signOut: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: [], error: null }),
        insert: () => ({ data: null, error: null }),
        update: () => ({ data: null, error: null }),
        delete: () => ({ data: null, error: null }),
        eq: function () {
          return this
        },
        order: function () {
          return this
        },
        limit: function () {
          return this
        },
        single: function () {
          return this
        },
        maybeSingle: function () {
          return this
        },
      }),
    }
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}
