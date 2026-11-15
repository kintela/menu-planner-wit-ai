const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(__dirname,
  "../../supabase/migrations/20261025070000_weekly_menu_sources_contract.sql")

test("source-list RPC resolves its target internally and returns only saved week dates and a label", () => {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  const sql = readFileSync(migrationPath, "utf8")
  const fn = sql.match(/CREATE OR REPLACE FUNCTION public\.get_weekly_menu_sources\b[\s\S]*?\$function\$;/)?.[0]
  assert.ok(fn)
  const signature = fn.match(/RETURNS TABLE\s*\(([^)]*)\)/i)?.[1] || ""
  assert.match(signature, /start_date date/i)
  assert.match(signature, /end_date date/i)
  assert.match(signature, /source_label text/i)
  assert.doesNotMatch(signature, /\bid\b|uuid|owner|user|menu|email|name|alias|avatar/i)
  assert.match(fn, /SECURITY DEFINER/)
  assert.match(fn, /SET search_path = ''/)
  assert.match(fn, /resolve_weekly_menu_target\(p_target_ref\)/)
  assert.match(fn, /menu\.is_saved = true/)
  assert.match(fn, /ORDER BY menu\.start_date DESC/)
  assert.doesNotMatch(fn, /menu_items|user_profiles|recipes|saved_at|created_at|updated_at/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_weekly_menu_sources\(uuid\) FROM PUBLIC;/)
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_weekly_menu_sources\(uuid\) FROM anon;/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_weekly_menu_sources\(uuid\) TO authenticated;/)
  assert.doesNotMatch(sql, /service_role/i)
})
