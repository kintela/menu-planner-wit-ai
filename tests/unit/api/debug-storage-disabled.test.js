const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

test("debug storage endpoint is a deterministic 404 without privileged storage access", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/debug-storage/route.ts"), "utf8")

  assert.doesNotMatch(source, /@supabase\/supabase-js|createClient|SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(source, /listBuckets|\.storage\b|\.list\s*\(/)
  assert.doesNotMatch(source, /console\.|process\.env|details\s*:/)
  assert.match(source, /NextResponse\.json\(\s*\{\s*error:\s*["']Not found["']\s*\}\s*,\s*\{\s*status:\s*404\s*\}\s*\)/s)
})
