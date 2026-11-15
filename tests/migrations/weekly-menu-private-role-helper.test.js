const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025090000_privatize_weekly_menu_role_helper.sql",
)

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

function functionDefinition(sql, schema, name) {
  const match = sql.match(new RegExp(
    `CREATE OR REPLACE FUNCTION ${schema}\\.${name}\\b[\\s\\S]*?\\$function\\$;`,
  ))
  assert.ok(match, `missing function: ${schema}.${name}`)
  return match[0]
}

test("parameterized profile-role capability moves out of the exposed public schema", () => {
  const sql = migrationSql()
  const privateHelper = functionDefinition(sql, "private", "weekly_menu_profile_is_authorized")

  assert.match(sql, /CREATE SCHEMA IF NOT EXISTS private/)
  assert.match(privateHelper, /profile\.id = p_profile_id/)
  assert.match(privateHelper, /profile\.role IN \([\s\S]*'user_restricted'::public\.user_role[\s\S]*'user_full'::public\.user_role[\s\S]*'admin'::public\.user_role/)
  assert.match(privateHelper, /SECURITY DEFINER/)
  assert.match(privateHelper, /SET search_path = ''/)
  assert.match(sql, /DROP FUNCTION public\.weekly_menu_profile_is_authorized\(uuid\);/)
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.weekly_menu_profile_is_authorized\s*\(/)
})

test("authenticated can execute the private helper for RLS but cannot expose it as a public RPC", () => {
  const sql = migrationSql()

  assert.match(sql, /REVOKE ALL ON SCHEMA private FROM PUBLIC;/)
  assert.match(sql, /REVOKE ALL ON SCHEMA private FROM anon;/)
  assert.match(sql, /GRANT USAGE ON SCHEMA private TO authenticated;/)
  assert.match(sql, /REVOKE ALL ON FUNCTION private\.weekly_menu_profile_is_authorized\(uuid\) FROM PUBLIC;/)
  assert.match(sql, /REVOKE ALL ON FUNCTION private\.weekly_menu_profile_is_authorized\(uuid\) FROM anon;/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION private\.weekly_menu_profile_is_authorized\(uuid\) TO authenticated;/)
  assert.doesNotMatch(sql, /GRANT[^;]+ON SCHEMA private[^;]+(?:PUBLIC|anon)/i)
  assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.[^(]+\(uuid\) TO authenticated;/)
})

test("actor helper remains argument-free and policies use only the private parameterized helper", () => {
  const sql = migrationSql()
  const actor = functionDefinition(sql, "public", "weekly_menu_actor_is_authorized")

  assert.match(actor, /weekly_menu_profile_is_authorized\(auth\.uid\(\)\)/)
  assert.match(actor, /SECURITY DEFINER/)
  assert.match(actor, /SET search_path = ''/)
  assert.doesNotMatch(actor.match(/weekly_menu_actor_is_authorized([^\n]*)/)?.[1] || "", /uuid|p_/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.weekly_menu_actor_is_authorized\(\) TO authenticated;/)
  assert.match(sql, /CREATE POLICY "weekly menus select managed"[\s\S]*private\.weekly_menu_profile_is_authorized\(user_id\)/)
  assert.match(sql, /CREATE POLICY "menu items select managed"[\s\S]*private\.weekly_menu_profile_is_authorized\(menu\.user_id\)/)
  assert.doesNotMatch(sql, /CREATE (?:OR REPLACE )?FUNCTION public\.[^(]+\(p_[^)]*uuid/)
})

test("follow-up is minimal, non-destructive, and never grants service role", () => {
  const sql = migrationSql()

  assert.doesNotMatch(sql, /ALTER TABLE|TRUNCATE|DROP TABLE|DELETE FROM|INSERT INTO|UPDATE public\./i)
  assert.doesNotMatch(sql, /\bservice_role\b/i)
  assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.(?:save_weekly_menu|empty_weekly_menu|get_weekly_menu_snapshot|get_weekly_menu_sources|get_weekly_menu_admin_targets)/)
})
