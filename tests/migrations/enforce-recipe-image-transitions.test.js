const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(__dirname, "../../supabase/migrations/20261025030000_enforce_recipe_image_transitions.sql")

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

test("storage DELETE requires only the current actor explicit cleanup authorization", () => {
  const sql = migrationSql()
  const helper = sql.match(/CREATE OR REPLACE FUNCTION public\.can_delete_recipe_image_object\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(helper, /recipe_image_cleanup_authorizations/)
  assert.match(helper, /cleanup\.actor_id = auth\.uid\(\)/)
  assert.doesNotMatch(helper, /recipe_managed_images|can_manage_recipe\s*\(/)
  const policy = sql.match(/CREATE POLICY "recipe images delete cleanup authorized"[\s\S]*?;/)?.[0] || ""
  assert.match(policy, /can_delete_recipe_image_object\(name\)/)
})

test("regular authenticated recipe writes cannot set image_url or immutable identity columns", () => {
  const sql = migrationSql()
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.recipes FROM authenticated;/)
  assert.match(sql, /GRANT SELECT ON TABLE public\.recipes TO authenticated;/)
  assert.match(sql, /GRANT INSERT \(name, ingredients, preparation, is_ai_generated, video_url, source_url, calories, user_id\)[\s\S]*TO authenticated;/)
  assert.match(sql, /GRANT UPDATE \(name, ingredients, preparation, is_ai_generated, video_url, source_url, calories\)[\s\S]*TO authenticated;/)
  const grants = sql.match(/GRANT (?:INSERT|UPDATE) \([^;]+;/g)?.join("\n") || ""
  assert.doesNotMatch(grants, /image_url|\bid\b|created_at/)
  const update = grants.match(/GRANT UPDATE[^;]+;/)?.[0] || ""
  assert.doesNotMatch(update, /user_id/)
})

test("follow-up is non-destructive and does not use service-role", () => {
  const sql = migrationSql()
  assert.doesNotMatch(sql, /service_role|TRUNCATE|DROP\s+TABLE|DELETE\s+FROM\s+(?:public\.)?recipes/i)
})
