export const createClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => {
        const selectQuery = {
          eq: (column: string, value: any) => ({
            single: async () => ({ data: null, error: null }),
            order: (column: string, options?: any) => ({
              limit: async (count: number) => ({ data: [], error: null }),
            }),
            limit: async (count: number) => ({ data: [], error: null }),
          }),
          order: (column: string, options?: any) => ({
            limit: async (count: number) => ({ data: [], error: null }),
          }),
          limit: async (count: number) => ({ data: [], error: null }),
        }
        return selectQuery
      },
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
