const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const test = require("node:test")

const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20261025000000_secure_user_profiles_and_avatars.sql",
)

function migrationSql() {
  return readFileSync(migrationPath, "utf8")
}

function policyDefinition(sql, name) {
  const match = sql.match(new RegExp(`CREATE POLICY "${name}"[\\s\\S]*?;`))
  assert.ok(match, `missing policy: ${name}`)
  return match[0]
}

test("the profile policy and grants allow only authenticated owners", () => {
  const sql = migrationSql()

  assert.match(sql, /DROP POLICY IF EXISTS "user_profiles select anon" ON public\.user_profiles;/)
  assert.match(sql, /CREATE POLICY "user_profiles select own"[\s\S]*FOR SELECT[\s\S]*TO authenticated[\s\S]*USING \(id = auth\.uid\(\)\);/)
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.user_profiles FROM anon;/)
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.user_profiles FROM authenticated;/)
  assert.match(sql, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.user_profiles TO authenticated;/)
  assert.doesNotMatch(sql, /DROP POLICY IF EXISTS "user_profiles (?:insert|update|delete) own"/)
})

test("the avatars bucket remains private and owner policies cover each object operation", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO storage\.buckets \(id, name, public\)[\s\S]*ON CONFLICT \(id\) DO UPDATE[\s\S]*public = false;/)

  for (const operation of ["select", "insert", "update", "delete"]) {
    const policy = policyDefinition(sql, `avatars ${operation} own`)
    assert.match(policy, new RegExp(`FOR ${operation.toUpperCase()}[\\s\\S]*TO authenticated`))
    assert.match(policy, /bucket_id = 'avatars'/)
    assert.match(policy, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/)
  }

  assert.match(policyDefinition(sql, "avatars select own"), /USING \(/)
  assert.match(policyDefinition(sql, "avatars insert own"), /WITH CHECK \(/)
  assert.doesNotMatch(policyDefinition(sql, "avatars insert own"), /USING \(/)
  assert.match(policyDefinition(sql, "avatars update own"), /USING \([\s\S]*WITH CHECK \(/)
  assert.match(policyDefinition(sql, "avatars delete own"), /USING \(/)
  assert.doesNotMatch(policyDefinition(sql, "avatars delete own"), /WITH CHECK \(/)
  assert.equal((sql.match(/bucket_id = 'avatars'/g) || []).length, 5)
  assert.equal((sql.match(/\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/g) || []).length, 5)
})

test("the migration contains no destructive data operation or privileged feature policy", () => {
  const sql = migrationSql()

  assert.doesNotMatch(sql, /\b(?:DELETE\s+FROM|TRUNCATE|DROP\s+TABLE)\b/i)
  assert.doesNotMatch(sql, /TO (?:anon|service_role)/)
  assert.doesNotMatch(sql, /\b(?:admin|is_admin)\b/i)
})
