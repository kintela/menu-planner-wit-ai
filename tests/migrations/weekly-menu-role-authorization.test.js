const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025080000_enforce_weekly_menu_actor_roles.sql",
)

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

function functionDefinition(sql, name) {
  const match = sql.match(new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${name}\\b[\\s\\S]*?\\$function\\$;`,
  ))
  assert.ok(match, `missing function: ${name}`)
  return match[0]
}

test("persisted actor capability admits exactly restricted, full, and admin profiles", () => {
  const sql = migrationSql()
  const capability = functionDefinition(sql, "weekly_menu_profile_is_authorized")

  assert.match(capability, /profile\.id = p_profile_id/)
  assert.match(capability, /profile\.role IN \([\s\S]*'user_restricted'::public\.user_role[\s\S]*'user_full'::public\.user_role[\s\S]*'admin'::public\.user_role[\s\S]*\)/)
  assert.match(capability, /SECURITY DEFINER/)
  assert.match(capability, /SET search_path = ''/)
  assert.match(functionDefinition(sql, "weekly_menu_actor_is_authorized"), /weekly_menu_profile_is_authorized\(auth\.uid\(\)\)/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.weekly_menu_actor_is_authorized\(\) TO authenticated;/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.weekly_menu_profile_is_authorized\(uuid\) TO authenticated;/)
  assert.doesNotMatch(sql, /GRANT EXECUTE[^;]+anon|service_role/i)
})

test("own and admin target resolution uniformly rejects missing, NULL, or unsupported persisted roles", () => {
  const resolver = functionDefinition(migrationSql(), "resolve_weekly_menu_target")

  assert.match(resolver, /IF NOT public\.weekly_menu_actor_is_authorized\(\) THEN[\s\S]*WM_FORBIDDEN/)
  assert.ok(
    resolver.indexOf("weekly_menu_actor_is_authorized()") < resolver.indexOf("IF p_target_ref IS NULL"),
    "the persisted role is checked before resolving own or admin targets",
  )
  assert.match(resolver, /current_user_is_admin\(\)/)
  assert.match(resolver, /profile\.role IN \([\s\S]*'user_restricted'::public\.user_role[\s\S]*'user_full'::public\.user_role[\s\S]*'admin'::public\.user_role/)
})

test("RLS owner reads and weekly RPC target resolution are protected by the persisted actor capability", () => {
  const sql = migrationSql()

  assert.match(sql, /CREATE POLICY "weekly menus select managed"[\s\S]*weekly_menu_actor_is_authorized\(\)[\s\S]*weekly_menu_profile_is_authorized\(user_id\)[\s\S]*user_id = auth\.uid\(\)[\s\S]*current_user_is_admin\(\)/)
  assert.match(sql, /CREATE POLICY "menu items select managed"[\s\S]*weekly_menu_actor_is_authorized\(\)[\s\S]*EXISTS[\s\S]*weekly_menu_profile_is_authorized\(menu\.user_id\)/)
  const targets = functionDefinition(sql, "get_weekly_menu_admin_targets")
  assert.match(targets, /weekly_menu_actor_is_authorized\(\)/)
  assert.match(targets, /WHERE profile\.role IN \(/)
  assert.match(targets, /SET search_path = ''/)

  const priorContracts = [
    "20261025050000_secure_weekly_menus.sql",
    "20261025060000_weekly_menu_read_contract.sql",
    "20261025070000_weekly_menu_sources_contract.sql",
  ].map((name) => readFileSync(resolve(__dirname, "../../supabase/migrations", name), "utf8")).join("\n")
  for (const name of ["save_weekly_menu", "empty_weekly_menu", "get_weekly_menu_snapshot", "get_weekly_menu_sources"]) {
    assert.match(functionDefinition(priorContracts, name), /resolve_weekly_menu_target\(p_target_ref\)/, name)
  }
})

test("migration replaces only managed policies and functions with explicit grants", () => {
  const sql = migrationSql()
  assert.doesNotMatch(sql, /ALTER TABLE[^;]+(?:ADD|DROP) COLUMN|TRUNCATE|DROP TABLE/i)
  for (const signature of [
    "weekly_menu_profile_is_authorized(uuid)",
    "weekly_menu_actor_is_authorized()",
    "get_weekly_menu_admin_targets()",
  ]) {
    const escaped = signature.replace(/[()]/g, "\\$&")
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM PUBLIC;`))
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM anon;`))
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${escaped} TO authenticated;`))
  }
})
