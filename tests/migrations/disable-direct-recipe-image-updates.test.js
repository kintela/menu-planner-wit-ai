const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(__dirname, "../../supabase/migrations/20261025040000_disable_direct_recipe_image_updates.sql")

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

test("follow-up drops the exact inherited recipe image UPDATE policy", () => {
  const sql = migrationSql()
  assert.match(sql, /DROP POLICY IF EXISTS "recipe images update managed" ON storage\.objects;/)
})

test("follow-up creates no replacement UPDATE policy for recipe-images", () => {
  const sql = migrationSql()
  assert.doesNotMatch(sql, /CREATE\s+POLICY[\s\S]*?FOR\s+UPDATE/i)
  assert.doesNotMatch(sql, /ALTER\s+POLICY/i)
})

test("follow-up does not alter other policies, buckets, schema or data", () => {
  const sql = migrationSql()
  assert.doesNotMatch(sql, /CREATE\s+POLICY|DROP\s+POLICY(?!\s+IF\s+EXISTS\s+"recipe images update managed")/i)
  assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO|FROM|storage\.)|TRUNCATE|DROP\s+(?:TABLE|SCHEMA)|ALTER\s+TABLE/i)
  assert.doesNotMatch(sql, /storage\.buckets|service_role/i)
})
