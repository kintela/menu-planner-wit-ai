import { createClient } from "@supabase/supabase-js"

// Valores hardcodeados temporalmente para evitar problemas de variables de entorno
const SUPABASE_URL = "https://iqarhmetoagfjjyfztzq.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYXJobWV0b2FnZmpqeWZ6dHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4NzEsImV4cCI6MjA1MDU0ODg3MX0.VYlBOJJvdOQaQgmkKLNKxQJGHVJQqQJGHVJQqQJGHVJQ"

export const createServerClient = () => {
  console.log("✅ Creating Supabase server client with hardcoded values")
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
