const { createClient } = require("@supabase/supabase-js")
const fs = require("fs")
const path = require("path")

function loadEnv(filePath) {
  try {
    const abs = path.resolve(filePath)
    const content = fs.readFileSync(abs, "utf8")
    content.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith("#")) return
      const idx = line.indexOf("=")
      if (idx === -1) return
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key && !(key in process.env)) {
        process.env[key] = value
      }
    })
  } catch (error) {
    console.warn("Could not load env file", filePath, error.message)
  }
}

loadEnv(".env.local")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error("Missing Supabase env vars. url=", url, "anon length=", anon ? anon.length : null)
  process.exit(1)
}

const supabase = createClient(url, anon)

async function run() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error("Usage: node scripts/test-supabase-cors.js <email> <password>")
    process.exit(1)
  }

  console.log("Sign in...")
  const signInRes = await supabase.auth.signInWithPassword({ email, password })
  console.log("signIn error:", signInRes.error)
  console.log("session present:", !!signInRes.data?.session)

  console.log("Sign out...")
  const signOutRes = await supabase.auth.signOut()
  console.log("signOut error:", signOutRes.error)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
