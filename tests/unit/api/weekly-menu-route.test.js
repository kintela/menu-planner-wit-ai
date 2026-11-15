const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

test("weekly menu GET/PUT/DELETE route is cookie-SSR only and has bounded strict inputs", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/weekly-menu/route.ts"), "utf8")
  assert.match(source, /createClient\(await cookies\(\)\)/)
  assert.match(source, /readWeeklyMenu/)
  assert.match(source, /saveWeeklyMenu/)
  assert.match(source, /MAX_BODY_BYTES/)
  assert.match(source, /(?:searchParams|parameters)\.getAll/)
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|authorization|bearer|x-user|user_id|owner_id/i)
  assert.match(source, /export async function DELETE/)
  assert.match(source, /emptyWeeklyMenu/)
})

for (const [relative, operation] of [
  ["sources/route.ts", "listWeeklyMenuSources"],
  ["copy/route.ts", "copyWeeklyMenu"],
  ["admin-targets/route.ts", "listWeeklyMenuAdminTargets"],
]) test(`${relative} uses cookie SSR and no privileged or client identity input`, () => {
  const source = fs.readFileSync(path.resolve(__dirname, `../../../app/api/weekly-menu/${relative}`), "utf8")
  assert.match(source, /createClient\(await cookies\(\)\)/)
  assert.match(source, new RegExp(operation))
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|@supabase\/supabase-js|authorization|bearer|x-user|user_id|owner_id/i)
  assert.match(source, /searchParams/)
})
