// Servidor Supabase para Server Components
export const createServerComponentClient = ({ cookies }: { cookies: any }) => {
  // Cliente mock para el servidor
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            console.log(`Mock query: SELECT ${columns || "*"} FROM ${table} WHERE ${column} = ${value}`)
            return { data: null, error: { message: "Mock server client" } }
          },
          order: async (column: string, options?: any) => {
            console.log(`Mock query: SELECT ${columns || "*"} FROM ${table} ORDER BY ${column}`)
            return { data: [], error: null }
          },
          limit: async (count: number) => {
            console.log(`Mock query: SELECT ${columns || "*"} FROM ${table} LIMIT ${count}`)
            return { data: [], error: null }
          },
        }),
        order: async (column: string, options?: any) => {
          console.log(`Mock query: SELECT ${columns || "*"} FROM ${table} ORDER BY ${column}`)
          return { data: [], error: null }
        },
        limit: async (count: number) => {
          console.log(`Mock query: SELECT ${columns || "*"} FROM ${table} LIMIT ${count}`)
          return { data: [], error: null }
        },
      }),
      insert: async (data: any) => {
        console.log(`Mock query: INSERT INTO ${table}`, data)
        return { data: null, error: { message: "Mock server client" } }
      },
      update: (data: any) => ({
        eq: async (column: string, value: any) => {
          console.log(`Mock query: UPDATE ${table} SET ... WHERE ${column} = ${value}`)
          return { data: null, error: { message: "Mock server client" } }
        },
      }),
      delete: () => ({
        eq: async (column: string, value: any) => {
          console.log(`Mock query: DELETE FROM ${table} WHERE ${column} = ${value}`)
          return { data: null, error: { message: "Mock server client" } }
        },
      }),
    }),
    auth: {
      getUser: async () => {
        console.log("Mock auth: getUser")
        return { data: { user: null }, error: null }
      },
    },
  }
}
