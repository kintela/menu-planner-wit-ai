const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025050000_secure_weekly_menus.sql",
)

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

function functionDefinition(sql, name) {
  const match = sql.match(
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\b[\\s\\S]*?\\$function\\$;`),
  )
  assert.ok(match, `missing function: ${name}`)
  return match[0]
}

function policyDefinition(sql, name) {
  const match = sql.match(new RegExp(`CREATE POLICY "${name}"[\\s\\S]*?;`))
  assert.ok(match, `missing policy: ${name}`)
  return match[0]
}

test("migration aborts before DDL for every incompatible historical shape", () => {
  const sql = migrationSql()
  const preconditions = sql.slice(0, sql.indexOf("ALTER TABLE public.weekly_menus"))

  assert.match(preconditions, /DO \$preconditions\$/)
  assert.match(preconditions, /GROUP BY menu\.user_id, menu\.start_date[\s\S]*HAVING count\(\*\) > 1/)
  assert.match(preconditions, /menu\.user_id IS NULL/)
  assert.match(preconditions, /item\.weekly_menu_id IS NULL[\s\S]*item\.recipe_id IS NULL/)
  assert.match(preconditions, /extract\(isodow FROM menu\.start_date\) <> 1/)
  assert.match(preconditions, /menu\.end_date <> menu\.start_date \+ 6/)
  assert.match(preconditions, /item\.day_of_week NOT BETWEEN 0 AND 6/)
  assert.match(preconditions, /item\.meal_type = 'comida'[\s\S]*item\.dish_order IN \(1, 2\)/)
  assert.match(preconditions, /item\.meal_type = 'cena'[\s\S]*item\.dish_order = 1/)
  assert.match(preconditions, /GROUP BY item\.weekly_menu_id, item\.day_of_week, item\.meal_type, item\.dish_order[\s\S]*HAVING count\(\*\) > 1/)
  assert.match(preconditions, /LEFT JOIN auth\.users/)
  assert.match(preconditions, /LEFT JOIN public\.user_profiles/)
  assert.match(preconditions, /LEFT JOIN public\.weekly_menus/)
  assert.match(preconditions, /LEFT JOIN public\.recipes/)
})

test("weekly menu and item constraints preserve dates, ownership, slots, and restrictive recipes", () => {
  const sql = migrationSql()

  assert.match(sql, /ALTER COLUMN user_id SET NOT NULL/)
  assert.doesNotMatch(sql, /DROP CONSTRAINT weekly_menus_user_id_fkey/)
  assert.match(sql, /UNIQUE \(user_id, start_date\)/)
  assert.match(sql, /CHECK \(extract\(isodow FROM start_date\) = 1\)/)
  assert.match(sql, /CHECK \(end_date = start_date \+ 6\)/)
  assert.match(sql, /ALTER COLUMN weekly_menu_id SET NOT NULL/)
  assert.match(sql, /ALTER COLUMN recipe_id SET NOT NULL/)
  assert.match(sql, /FOREIGN KEY \(weekly_menu_id\)[\s\S]*ON DELETE CASCADE/)
  assert.match(sql, /FOREIGN KEY \(recipe_id\)[\s\S]*ON DELETE NO ACTION/)
  assert.match(sql, /CHECK \([\s\S]*day_of_week BETWEEN 0 AND 6[\s\S]*meal_type = 'comida'[\s\S]*dish_order IN \(1, 2\)[\s\S]*meal_type = 'cena'[\s\S]*dish_order = 1/)
  assert.match(sql, /UNIQUE \(weekly_menu_id, day_of_week, meal_type, dish_order\)/)
})

test("Madrid time and opaque planner targets are server-derived and privacy-minimal", () => {
  const sql = migrationSql()
  const madridWeek = functionDefinition(sql, "madrid_current_week_start")
  const targets = functionDefinition(sql, "get_weekly_menu_admin_targets")
  const targetSignature = targets.match(/RETURNS TABLE\s*\(([^)]*)\)/i)?.[1] || ""

  assert.match(madridWeek, /Europe\/Madrid/)
  assert.match(madridWeek, /statement_timestamp\(\)/)
  assert.match(madridWeek, /extract\(isodow/)
  assert.match(sql, /planner_ref uuid NOT NULL DEFAULT gen_random_uuid\(\)/)
  assert.match(sql, /UNIQUE \(planner_ref\)/)
  assert.match(targets, /current_user_is_admin\(\)/)
  assert.match(targets, /COALESCE\(NULLIF\(btrim\(profile\.alias\), ''\), 'Usuario'\)/)
  assert.match(targets, /replace\(profile\.planner_ref::text, '-', ''\)/)
  assert.match(targetSignature, /target_ref uuid/i)
  assert.match(targetSignature, /target_label text/i)
  assert.doesNotMatch(targetSignature, /\bid\b|email|name|phone|avatar|user/i)
  assert.doesNotMatch(targets, /profile\.(?:email|full_name|first_name|last_name|phone|avatar_url|id)\b/)
})

test("RLS permits authenticated owner/admin reads including history and no direct writes", () => {
  const sql = migrationSql()
  const menus = policyDefinition(sql, "weekly menus select managed")
  const items = policyDefinition(sql, "menu items select managed")

  assert.match(menus, /FOR SELECT[\s\S]*TO authenticated/)
  assert.match(menus, /user_id = auth\.uid\(\)[\s\S]*current_user_is_admin\(\)/)
  assert.doesNotMatch(menus, /madrid_current_week_start|start_date\s*>?=/)
  assert.match(items, /FOR SELECT[\s\S]*TO authenticated[\s\S]*EXISTS[\s\S]*public\.weekly_menus[\s\S]*user_id = auth\.uid\(\)[\s\S]*current_user_is_admin\(\)/)
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.weekly_menus FROM anon;/)
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.menu_items FROM anon;/)
  assert.match(sql, /GRANT SELECT ON TABLE public\.weekly_menus TO authenticated;/)
  assert.match(sql, /GRANT SELECT ON TABLE public\.menu_items TO authenticated;/)
  assert.doesNotMatch(sql, /CREATE POLICY "[^"]+"[\s\S]*?FOR (?:INSERT|UPDATE|DELETE)/)
})

test("save RPC validates authority, week, recipes, and slots before atomic replacement", () => {
  const sql = migrationSql()
  const save = functionDefinition(sql, "save_weekly_menu")
  const resolver = functionDefinition(sql, "resolve_weekly_menu_target")

  assert.match(save, /SECURITY DEFINER/)
  assert.match(save, /SET search_path = ''/)
  assert.match(resolver, /auth\.uid\(\)/)
  assert.match(resolver, /current_user_is_admin\(\)/)
  assert.match(save, /resolve_weekly_menu_target\(p_target_ref\)/)
  assert.match(save, /madrid_current_week_start\(\)/)
  assert.match(save, /extract\(isodow FROM p_start_date\) <> 1/)
  assert.match(save, /jsonb_typeof\(p_slots\) <> 'array'/)
  assert.match(save, /jsonb_array_elements\(p_slots\)/)
  assert.match(save, /day_of_week[\s\S]*meal_type[\s\S]*dish_order[\s\S]*recipe_id[\s\S]*sacado_del_congelador/)
  assert.match(save, /count\(\*\) <> count\(DISTINCT/)
  assert.match(save, /FROM public\.recipes/)
  assert.match(save, /FOR KEY SHARE/)
  assert.match(save, /pg_advisory_xact_lock/)
  assert.match(save, /jsonb_array_length\(p_slots\) = 0[\s\S]*DELETE FROM public\.weekly_menus/)
  assert.match(save, /INSERT INTO public\.weekly_menus[\s\S]*ON CONFLICT \(user_id, start_date\) DO UPDATE/)
  assert.match(save, /DELETE FROM public\.menu_items/)
  assert.match(save, /INSERT INTO public\.menu_items/)
})

test("empty RPC deletes immediately and all RPC execution is authenticated-only", () => {
  const sql = migrationSql()
  const empty = functionDefinition(sql, "empty_weekly_menu")

  assert.match(empty, /SECURITY DEFINER/)
  assert.match(empty, /SET search_path = ''/)
  assert.match(empty, /resolve_weekly_menu_target\(p_target_ref\)/)
  assert.match(empty, /madrid_current_week_start\(\)/)
  assert.match(empty, /pg_advisory_xact_lock/)
  assert.match(empty, /DELETE FROM public\.weekly_menus/)

  for (const signature of [
    "save_weekly_menu(date, jsonb, uuid)",
    "empty_weekly_menu(date, uuid)",
    "get_weekly_menu_admin_targets()",
  ]) {
    const escaped = signature.replace(/[()]/g, "\\$&")
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM PUBLIC;`))
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${escaped} FROM anon;`))
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${escaped} TO authenticated;`))
  }
})

test("migration is non-destructive, keeps contracts, and never grants service role", () => {
  const sql = migrationSql()
  const schemaChanges = sql.slice(0, sql.indexOf("CREATE OR REPLACE FUNCTION public.save_weekly_menu"))

  assert.doesNotMatch(sql, /\b(?:TRUNCATE|DROP\s+TABLE)\b/i)
  assert.doesNotMatch(schemaChanges, /DELETE\s+FROM\s+public\.(?:weekly_menus|menu_items|recipes|user_profiles)\b/i)
  assert.doesNotMatch(sql, /\bservice_role\b/i)
  assert.doesNotMatch(sql, /ALTER TABLE public\.recipes|CREATE OR REPLACE FUNCTION public\.get_public_recipes/i)
  assert.doesNotMatch(sql, /GRANT[^;]*\banno?n\b/i)
})
