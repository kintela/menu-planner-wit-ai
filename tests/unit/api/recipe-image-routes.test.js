const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

test("recipe image route uses cookie SSR and a strict one-image multipart contract", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/recipes/[id]/image/route.ts"), "utf8")
  assert.match(source, /createClient\(await cookies\(\)\)/)
  assert.match(source, /multipart\/form-data/)
  assert.match(source, /entries\(\)/)
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|listBuckets|createBucket|updateBucket/)
})

test("generic upload endpoint is a deterministic 404 without storage or privileged access", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/upload-image/route.ts"), "utf8")
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|\.storage\b|listBuckets|createBucket|updateBucket|process\.env|console\./)
  assert.match(source, /NextResponse\.json\(\s*\{\s*error:\s*["']Not found["']\s*\}\s*,\s*\{\s*status:\s*404\s*\}\s*\)/s)
})

test("recipe DELETE delegates post-row storage cleanup without exposing its context", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/recipes/[id]/route.ts"), "utf8")
  assert.match(source, /cleanupDeletedRecipeImage\(supabase,\s*await deleteRecipe\(supabase, id\)\)/)
  assert.doesNotMatch(source, /cleanupContext.*NextResponse/s)
})
