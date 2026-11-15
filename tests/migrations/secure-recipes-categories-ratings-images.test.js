const assert = require("node:assert/strict")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025010000_secure_recipes_categories_ratings_images.sql",
)

function migrationSql() {
  assert.ok(existsSync(migrationPath), `missing migration: ${migrationPath}`)
  return readFileSync(migrationPath, "utf8")
}

function policyDefinition(sql, name) {
  const match = sql.match(new RegExp(`CREATE POLICY "${name}"[\\s\\S]*?;`))
  assert.ok(match, `missing policy: ${name}`)
  return match[0]
}

function functionDefinition(sql, name) {
  const match = sql.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${name}\\b[\\s\\S]*?\\$function\\$;`,
    ),
  )
  assert.ok(match, `missing function: ${name}`)
  return match[0]
}

test("recipes expose only a public projection while direct writes are owner/admin scoped", () => {
  const sql = migrationSql()
  const projection = functionDefinition(sql, "get_public_recipes")
  const signature = projection.match(/RETURNS TABLE\s*\(([^)]*)\)/i)?.[1] || ""

  assert.match(projection, /SECURITY DEFINER/)
  assert.match(projection, /SET search_path = ''/)
  assert.match(projection, /COALESCE\(NULLIF\(btrim\(up\.alias\), ''\), 'Usuario'\)/)
  assert.match(signature, /author_alias text/i)
  assert.match(signature, /rating_average numeric/i)
  assert.match(signature, /rating_count bigint/i)
  assert.match(signature, /categories jsonb/i)
  assert.doesNotMatch(
    signature,
    /user_id|profile_id|email|full_name|first_name|last_name|phone|avatar/i,
  )
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.recipes FROM anon;/)
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.recipes TO authenticated;/)
  assert.match(policyDefinition(sql, "recipes insert own"), /WITH CHECK \(user_id = auth\.uid\(\)\)/)
  for (const name of ["recipes select managed", "recipes update managed", "recipes delete managed"]) {
    assert.match(policyDefinition(sql, name), /user_id = auth\.uid\(\)|current_user_is_admin\(\)/)
  }
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_public_recipes\(integer\) TO anon, authenticated;/)
})

test("categories preserve historical duplicates but serialize and reject new normalized duplicates", () => {
  const sql = migrationSql()
  const normalizer = functionDefinition(sql, "enforce_category_name")
  const merge = functionDefinition(sql, "merge_categories")

  assert.match(sql, /CREATE TABLE public\.category_name_registry[\s\S]*normalized_name text PRIMARY KEY/)
  assert.match(sql, /INSERT INTO public\.category_name_registry[\s\S]*SELECT DISTINCT lower\(btrim\(category\.name\)\)/)
  assert.match(normalizer, /NEW\.name := btrim\(NEW\.name\)/)
  assert.match(normalizer, /NEW\.name = ''/)
  assert.match(normalizer, /INSERT INTO public\.category_name_registry/)
  assert.match(normalizer, /ON CONFLICT \(normalized_name\) DO NOTHING/)
  assert.match(normalizer, /RETURNING normalized_name INTO reserved_name/)
  assert.match(functionDefinition(sql, "release_category_name"), /DELETE FROM public\.category_name_registry[\s\S]*NOT EXISTS/)
  assert.doesNotMatch(sql, /CREATE\s+UNIQUE\s+INDEX[\s\S]*categories/i)
  assert.match(policyDefinition(sql, "categories select public"), /TO anon, authenticated[\s\S]*USING \(true\)/)
  assert.match(policyDefinition(sql, "categories insert authenticated"), /TO authenticated[\s\S]*WITH CHECK \(auth\.uid\(\) IS NOT NULL\)/)
  assert.match(policyDefinition(sql, "categories update admin"), /current_user_is_admin\(\)/)
  assert.match(policyDefinition(sql, "categories delete admin"), /current_user_is_admin\(\)/)
  assert.match(functionDefinition(sql, "guard_category_delete"), /public\.recipe_categories/)
  assert.match(merge, /SECURITY DEFINER/)
  assert.match(merge, /current_user_is_admin\(\)/)
  assert.match(merge, /FOR UPDATE/)
  assert.match(merge, /ON CONFLICT \(recipe_id, category_id\) DO NOTHING/)
  assert.match(merge, /DELETE FROM public\.recipe_categories[\s\S]*DELETE FROM public\.categories/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.merge_categories\(integer, integer\) TO authenticated;/)
})

test("recipe-category links and rating rows have least-privilege RLS", () => {
  const sql = migrationSql()

  assert.match(policyDefinition(sql, "recipe categories select public"), /TO anon, authenticated[\s\S]*USING \(true\)/)
  for (const name of ["recipe categories insert managed", "recipe categories update managed", "recipe categories delete managed"]) {
    assert.match(policyDefinition(sql, name), /can_manage_recipe\(/)
  }
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.recipe_ratings FROM anon;/)
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.recipe_ratings TO authenticated;/)
  for (const name of ["ratings select own", "ratings insert own", "ratings update own", "ratings delete own"]) {
    assert.match(policyDefinition(sql, name), /user_id = auth\.uid\(\)/)
  }
  const selfRating = functionDefinition(sql, "reject_self_rating")
  assert.match(selfRating, /public\.recipes/)
  assert.match(selfRating, /r\.user_id = NEW\.user_id/)
  assert.match(sql, /CREATE TRIGGER reject_self_rating_before_write[\s\S]*BEFORE INSERT OR UPDATE OF recipe_id, user_id/)
})

test("menu references become restrictive without changing rows", () => {
  const sql = migrationSql()
  const constraint = sql.match(
    /ADD CONSTRAINT menu_items_recipe_id_fkey[\s\S]*?;/,
  )?.[0] || ""

  assert.match(sql, /DROP CONSTRAINT IF EXISTS menu_items_recipe_id_fkey/)
  assert.match(constraint, /FOREIGN KEY \(recipe_id\) REFERENCES public\.recipes\(id\) ON DELETE (?:RESTRICT|NO ACTION)/)
  assert.doesNotMatch(constraint, /ON DELETE CASCADE/i)
})

test("recipe images use a public bucket and private canonical metadata", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO storage\.buckets \(id, name, public\)[\s\S]*'recipe-images', 'recipe-images', true[\s\S]*ON CONFLICT \(id\) DO UPDATE[\s\S]*public = true;/)
  assert.match(sql, /CREATE TABLE public\.recipe_managed_images/)
  assert.match(sql, /recipe_id integer PRIMARY KEY/)
  assert.match(sql, /object_path text NOT NULL UNIQUE/)
  assert.match(sql, /split_part\(object_path, '\/', 1\) = recipe_id::text/)
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.recipe_managed_images FROM anon;/)
  for (const name of ["managed images select", "managed images insert", "managed images update", "managed images delete"]) {
    assert.match(policyDefinition(sql, name), /TO authenticated/)
    assert.match(policyDefinition(sql, name), /can_manage_recipe\(recipe_id\)/)
  }
  assert.match(policyDefinition(sql, "recipe images select public"), /TO anon, authenticated[\s\S]*bucket_id = 'recipe-images'/)
  for (const name of ["recipe images insert managed", "recipe images update managed", "recipe images delete managed"]) {
    const policy = policyDefinition(sql, name)
    assert.match(policy, /TO authenticated/)
    assert.match(policy, /bucket_id = 'recipe-images'/)
    assert.match(policy, /can_manage_recipe_image_path\(name\)/)
  }
  const pathCheck = functionDefinition(sql, "can_manage_recipe_image_path")
  assert.match(pathCheck, /\^\[1-9\]\[0-9\]\*\//)
  assert.match(pathCheck, /public\.can_manage_recipe/)
})

test("all feature helpers fix search_path and grants are explicit", () => {
  const sql = migrationSql()
  const functions = [
    "current_user_is_admin",
    "can_manage_recipe",
    "get_public_recipes",
    "enforce_category_name",
    "release_category_name",
    "guard_category_delete",
    "merge_categories",
    "reject_self_rating",
    "can_manage_recipe_image_path",
  ]

  for (const name of functions) {
    assert.match(functionDefinition(sql, name), /SET search_path = ''/)
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\b[\\s\\S]*? FROM PUBLIC;`))
  }
  assert.doesNotMatch(sql, /service_role/i)
})

test("migration preserves existing recipes, associations, ratings, URLs, and objects", () => {
  const sql = migrationSql()

  assert.doesNotMatch(sql, /\bTRUNCATE\b|\bDROP\s+TABLE\b/i)
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+(?:public\.)?(?:recipes|recipe_ratings|menu_items|recipe_managed_images)\b/i)
  assert.doesNotMatch(sql, /DELETE\s+FROM\s+(?:storage\.)?objects\b/i)
  assert.doesNotMatch(sql, /UPDATE\s+(?:public\.)?recipes\s+SET\s+image_url/i)
})
