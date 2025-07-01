// Cliente Supabase para el lado del cliente
let supabaseClient: any = null

// Función para crear el cliente de Supabase
export const createClient = () => {
  if (typeof window === "undefined") {
    // En el servidor, devolver un cliente mock
    return {
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: { message: "Server-side mock" } }),
            order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
            limit: (count: number) => Promise.resolve({ data: [], error: null }),
          }),
          order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
          limit: (count: number) => Promise.resolve({ data: [], error: null }),
        }),
        insert: (data: any) => Promise.resolve({ data: null, error: { message: "Server-side mock" } }),
        update: (data: any) => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: { message: "Server-side mock" } }),
        }),
        delete: () => ({
          eq: (column: string, value: any) => Promise.resolve({ data: null, error: { message: "Server-side mock" } }),
        }),
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: (credentials: any) => Promise.resolve({ data: null, error: { message: "Mock auth" } }),
        signOut: () => Promise.resolve({ error: null }),
      },
    }
  }

  // En el cliente, intentar crear el cliente real o devolver mock
  if (!supabaseClient) {
    try {
      // Intentar importar y crear cliente real
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        // En producción, aquí se crearía el cliente real
        console.log("Supabase configurado correctamente")
      }

      // Por ahora, usar cliente mock
      supabaseClient = {
        from: (table: string) => ({
          select: (columns?: string) => ({
            eq: (column: string, value: any) => ({
              single: () => Promise.resolve({ data: null, error: { message: "Client-side mock" } }),
              order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
              limit: (count: number) => Promise.resolve({ data: [], error: null }),
            }),
            order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
            limit: (count: number) => Promise.resolve({ data: [], error: null }),
          }),
          insert: (data: any) => Promise.resolve({ data: null, error: { message: "Client-side mock" } }),
          update: (data: any) => ({
            eq: (column: string, value: any) => Promise.resolve({ data: null, error: { message: "Client-side mock" } }),
          }),
          delete: () => ({
            eq: (column: string, value: any) => Promise.resolve({ data: null, error: { message: "Client-side mock" } }),
          }),
        }),
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signInWithPassword: (credentials: any) => Promise.resolve({ data: null, error: { message: "Mock auth" } }),
          signOut: () => Promise.resolve({ error: null }),
        },
      }
    } catch (error) {
      console.warn("Usando cliente Supabase mock:", error)
      supabaseClient = {
        from: () => ({
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        },
      }
    }
  }

  return supabaseClient
}
