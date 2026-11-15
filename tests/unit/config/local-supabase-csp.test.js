const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

test("development CSP permits only an explicitly configured localhost Supabase HTTP origin", () => {
  const source = readFileSync(resolve(__dirname, "../../../next.config.mjs"), "utf8")
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/)
  assert.ok(source.includes("/^http:\\/\\/(?:localhost|127\\.0\\.0\\.1):\\d+$/"))
  assert.match(source, /!isProduction/)
  assert.match(source, /connect-src[^\n]+localSupabaseConnectOrigin/)
})
