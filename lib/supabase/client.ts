import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

// Check if we're in a preview environment
function isPreviewEnvironment() {
  if (typeof window === "undefined") return false
  return (
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("vusercontent.net") ||
    window.location.hostname.includes("vercel.app")
  )
}

// Mock Supabase client for preview environment
function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: "Preview mode - authentication disabled" },
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: "Preview mode - registration disabled" },
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: "Preview mode - password reset disabled" },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: "Preview mode - database disabled" } }),
        }),
        order: () => ({
          limit: async () => ({ data: [], error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: { message: "Preview mode - database disabled" } }),
      update: async () => ({ data: null, error: { message: "Preview mode - database disabled" } }),
      delete: async () => ({ data: null, error: { message: "Preview mode - database disabled" } }),
      upsert: async () => ({ data: null, error: { message: "Preview mode - database disabled" } }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Preview mode - storage disabled" } }),
        getPublicUrl: () => ({ data: { publicUrl: "/placeholder.svg?height=200&width=200" } }),
      }),
    },
  } as any
}

export function createClient() {
  // Return mock client in preview environment
  if (isPreviewEnvironment()) {
    console.warn("🔍 Preview environment detected - using mock Supabase client")
    return createMockClient()
  }

  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Faltan variables de entorno de Supabase")
    // Return mock client instead of throwing error
    console.warn("🔍 Using mock Supabase client due to missing environment variables")
    return createMockClient()
  }

  try {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "x-client-info": `menu-planner@1.0.0`,
        },
      },
    })

    return supabaseClient
  } catch (error) {
    console.error("❌ Error al crear cliente Supabase:", error)
    // Return mock client instead of throwing error
    console.warn("🔍 Using mock Supabase client due to initialization error")
    return createMockClient()
  }
}

// Alias para compatibilidad con código existente
export function getSupabaseClient() {
  return createClient()
}
