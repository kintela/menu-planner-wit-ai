import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export const createClient = () => createClientComponentClient()

export const supabase = createClient()

// Cliente mock para entorno v0
// export const supabase = {
//   auth: {
//     getSession: () => Promise.resolve({ data: { session: null }, error: null }),
//     onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
//     signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
//     signOut: () => Promise.resolve({ error: null }),
//   },
//   from: (table: string) => ({
//     select: (columns?: string) => ({
//       eq: (column: string, value: any) => ({
//         order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
//         single: () => Promise.resolve({ data: null, error: null }),
//       }),
//       order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
//     }),
//     insert: (data: any) => Promise.resolve({ data: null, error: null }),
//     update: (data: any) => ({
//       eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
//     }),
//     delete: () => ({
//       eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
//     }),
//   }),
// }
