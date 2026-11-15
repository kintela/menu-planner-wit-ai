const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(__dirname, "../../supabase/migrations/20261025020000_harden_recipe_image_lifecycle.sql")
const sql = () => {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

test("managed image metadata and cleanup state have no authenticated direct access", () => {
  const source = sql()
  assert.match(source, /REVOKE ALL PRIVILEGES ON TABLE public\.recipe_managed_images FROM authenticated;/)
  assert.match(source, /CREATE TABLE public\.recipe_image_cleanup_authorizations/)
  assert.match(source, /REVOKE ALL PRIVILEGES ON TABLE public\.recipe_image_cleanup_authorizations FROM authenticated;/)
  assert.doesNotMatch(source, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)[^;]*recipe_(?:managed_images|image_cleanup_authorizations)[^;]*authenticated/i)
  for (const policy of ["managed images select", "managed images insert", "managed images update", "managed images delete"]) {
    assert.match(source, new RegExp(`DROP POLICY IF EXISTS "${policy}" ON public\\.recipe_managed_images;`))
  }
})

test("security definer transitions validate actor, canonical path, storage object and fixed search path", () => {
  const source = sql()
  for (const name of ["associate_recipe_image", "clear_recipe_image", "delete_recipe_with_image_cleanup", "finalize_recipe_image_cleanup"]) {
    const definition = source.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\b[\\s\\S]*?\\$function\\$;`))?.[0] || ""
    assert.match(definition, /SECURITY DEFINER/)
    assert.match(definition, /SET search_path = ''/)
    assert.match(definition, /auth\.uid\(\)/)
    assert.match(source, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\b[\\s\\S]*? TO authenticated;`))
  }
  const associate = source.match(/CREATE OR REPLACE FUNCTION public\.associate_recipe_image\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(associate, /storage\.objects/)
  assert.match(associate, /recipe_image_cleanup_authorizations/)
  assert.match(associate, /recipe_managed_images/)
  assert.match(associate, /UPDATE public\.recipes[\s\S]*image_url/)
  const deletion = source.match(/CREATE OR REPLACE FUNCTION public\.delete_recipe_with_image_cleanup\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(deletion, /public\.menu_items/)
  assert.match(deletion, /DELETE FROM public\.recipes/)
  assert.match(deletion, /recipe_image_cleanup_authorizations/)
})

test("storage delete rejects arbitrary manageable paths and allows only current or actor cleanup accreditation", () => {
  const source = sql()
  const helper = source.match(/CREATE OR REPLACE FUNCTION public\.can_delete_recipe_image_object\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(helper, /recipe_managed_images/)
  assert.match(helper, /recipe_image_cleanup_authorizations/)
  assert.match(helper, /actor_id = auth\.uid\(\)/)
  assert.doesNotMatch(helper, /can_manage_recipe_image_path/)
  const policy = source.match(/CREATE POLICY "recipe images delete accredited"[\s\S]*?;/)?.[0] || ""
  assert.match(policy, /can_delete_recipe_image_object\(name\)/)
  assert.doesNotMatch(policy, /can_manage_recipe_image_path/)
})

test("a storage upload creates explicit actor cleanup accreditation and finalization requires object absence", () => {
  const source = sql()
  const trigger = source.match(/CREATE OR REPLACE FUNCTION public\.accredit_recipe_image_upload\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(trigger, /recipe_image_cleanup_authorizations/)
  assert.match(trigger, /auth\.uid\(\)/)
  assert.match(source, /AFTER INSERT ON storage\.objects[\s\S]*accredit_recipe_image_upload/)
  const finalize = source.match(/CREATE OR REPLACE FUNCTION public\.finalize_recipe_image_cleanup\b[\s\S]*?\$function\$;/)?.[0] || ""
  assert.match(finalize, /NOT EXISTS[\s\S]*storage\.objects/)
})
