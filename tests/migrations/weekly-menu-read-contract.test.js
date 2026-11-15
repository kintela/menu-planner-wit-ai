const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const migration = path.resolve(__dirname, "../../supabase/migrations/20261025060000_weekly_menu_read_contract.sql")

test("weekly menu read RPC resolves opaque targets internally and returns no owner identity", () => {
  const sql = fs.readFileSync(migration, "utf8")
  assert.match(sql, /get_weekly_menu_snapshot\s*\(/i)
  assert.match(sql, /SECURITY DEFINER/i)
  assert.match(sql, /SET search_path = ''/i)
  assert.match(sql, /resolve_weekly_menu_target\(p_target_ref\)/i)
  assert.match(sql, /item\.meal_type::text/i)
  assert.match(sql, /GRANT EXECUTE[^;]+authenticated/is)
  assert.doesNotMatch(sql, /RETURNS TABLE\s*\([^)]*owner_id/is)
  assert.doesNotMatch(sql, /service_role|email|phone|avatar|full_name/i)
  assert.doesNotMatch(sql, /GRANT EXECUTE[^;]+anon/is)
})
