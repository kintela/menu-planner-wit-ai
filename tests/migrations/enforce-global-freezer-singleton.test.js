const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025100000_enforce_global_freezer_singleton.sql",
)

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

test("aborts before changing data when singleton preconditions are invalid", () => {
  const sql = migrationSql()
  assert.match(sql, /DO\s*\$migration\$/i)
  assert.match(sql, /COUNT\(\*\).*congeladores/is)
  assert.match(sql, /RAISE EXCEPTION[^;]*(?:más de un|more than one|multiple)/i)
  assert.match(sql, /user_profiles[\s\S]*role\s*=\s*'admin'/i)
  assert.match(sql, /RAISE EXCEPTION[^;]*(?:admin|propietario)/i)
  assert.ok(sql.indexOf("DO $migration$") < sql.indexOf("CREATE UNIQUE INDEX"))
})

test("enforces one global freezer without a fixed UUID", () => {
  const sql = migrationSql()
  assert.match(sql, /CREATE UNIQUE INDEX\s+congeladores_singleton_global_idx/i)
  assert.match(sql, /ON\s+public\.congeladores\s*\(\s*\(true\)\s*\)/i)
  assert.doesNotMatch(sql, /00000000-0000-4\d{3}-[89ab]\d{3}-[0-9a-f-]{12}/i)
  assert.match(sql, /server\/RLS[\s\S]*fixed account or UUID/i)
  assert.doesNotMatch(sql, /ALTER TABLE\s+public\.congeladores\s+DROP/i)
})

test("RLS only permits the current admin owner and does not enumerate anonymously", () => {
  const sql = migrationSql()
  assert.match(sql, /private\.congelador_admin_actor[\s\S]*SECURITY DEFINER/i)
  assert.match(sql, /SET search_path\s*=\s*''/i)
  assert.match(sql, /role\s*=\s*'admin'/i)
  assert.match(sql, /usuario_id\s*=\s*auth\.uid\(\)/i)
  assert.match(sql, /REVOKE ALL ON TABLE public\.congeladores FROM PUBLIC, anon, authenticated/i)
  assert.match(sql, /REVOKE ALL ON TABLE public\.congeladores_usuarios FROM PUBLIC, anon, authenticated/i)
  assert.match(sql, /TO authenticated\s+USING[\s\S]*congelador_admin_actor/i)
  assert.doesNotMatch(sql, /TO anon\s+USING|TO anon\s+WITH CHECK/i)
})

test("preserves the historical model and is non-destructive and freezer-scoped", () => {
  const sql = migrationSql()
  assert.match(sql, /congeladores_usuarios/i)
  assert.match(sql, /cajones_congelador/i)
  assert.match(sql, /elementos_cajon/i)
  assert.doesNotMatch(sql, /\b(?:DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.)\b/i)
  assert.doesNotMatch(sql, /\b(?:recipes|weekly_menus|menu_items|categories)\b/i)
  assert.doesNotMatch(sql, /service[-_ ]role/i)
})
