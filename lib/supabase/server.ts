export const createClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: null }),
          order: async (column: string, options?: any) => ({ data: [], error: null }),
          limit: async (count: number) => ({ data: [], error: null }),
        }),
        order: async (column: string, options?: any) => ({ data: [], error: null }),
        limit: async (count: number) => ({ data: [], error: null }),
      }),
      insert: async (data: any) => ({ data: null, error: null }),
      update: (data: any) => ({
        eq: async (column: string, value: any) => ({ data: null, error: null }),
      }),
      delete: () => ({
        eq: async (column: string, value: any) => ({ data: null, error: null }),
      }),
    }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  }
}
