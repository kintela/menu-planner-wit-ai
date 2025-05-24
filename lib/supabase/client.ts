import { createClient } from "@supabase/supabase-js"

// Valores hardcodeados temporalmente para evitar problemas de variables de entorno
const SUPABASE_URL = "https://iqarhmetoagfjjyfztzq.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYXJobWV0b2FnZmpqeWZ6dHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4NzEsImV4cCI6MjA1MDU0ODg3MX0.VYlBOJJvdOQaQgmkKLNKxQJGHVJQqQJGHVJQqQJGHVJQ"

// Crear un singleton para el cliente de Supabase en el lado del cliente
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    console.log("✅ Creating Supabase client with hardcoded values")
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseClient
}
