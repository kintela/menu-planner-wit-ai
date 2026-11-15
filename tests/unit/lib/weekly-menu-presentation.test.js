const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../../..")

test("presentation model exposes exactly 21 canonical slots", () => {
  const { buildConceptualSlots } = require("../../../lib/weekly-menu/weekly-menu-presentation")
  const slots = buildConceptualSlots([])
  assert.equal(slots.length, 21)
  assert.equal(new Set(slots.map((slot) => `${slot.day_of_week}:${slot.meal_type}:${slot.dish_order}`)).size, 21)
  assert.deepEqual(slots.filter((slot) => slot.day_of_week === 0).map(({ meal_type, dish_order }) => [meal_type, dish_order]), [
    ["comida", 1], ["comida", 2], ["cena", 1],
  ])
})

test("readonly state rejects add, remove, freezer, copy and restore mutations", () => {
  const { reduceDraft } = require("../../../lib/weekly-menu/weekly-menu-presentation")
  const original = [{ day_of_week: 0, meal_type: "comida", dish_order: 1, recipe_id: 7, sacado_del_congelador: false }]
  for (const action of [
    { type: "set", day_of_week: 1, meal_type: "cena", dish_order: 1, recipe_id: 9 },
    { type: "remove", day_of_week: 0, meal_type: "comida", dish_order: 1 },
    { type: "toggle-freezer", day_of_week: 0, meal_type: "comida", dish_order: 1 },
    { type: "copy", slots: [] },
    { type: "restore", slots: [] },
  ]) assert.deepEqual(reduceDraft(original, action, false), original)
})

test("draft supports replacement, removal, freezer, copy and restore without mutating inputs", () => {
  const { reduceDraft } = require("../../../lib/weekly-menu/weekly-menu-presentation")
  const saved = [{ day_of_week: 0, meal_type: "comida", dish_order: 1, recipe_id: 7, sacado_del_congelador: false }]
  const replacement = reduceDraft(saved, { type: "set", day_of_week: 0, meal_type: "comida", dish_order: 1, recipe_id: 8 }, true)
  assert.equal(replacement[0].recipe_id, 8)
  assert.equal(saved[0].recipe_id, 7)
  const frozen = reduceDraft(replacement, { type: "toggle-freezer", day_of_week: 0, meal_type: "comida", dish_order: 1 }, true)
  assert.equal(frozen[0].sacado_del_congelador, true)
  assert.deepEqual(reduceDraft(frozen, { type: "remove", day_of_week: 0, meal_type: "comida", dish_order: 1 }, true), [])
  assert.deepEqual(reduceDraft([], { type: "copy", slots: saved }, true), saved)
  assert.deepEqual(reduceDraft([], { type: "restore", slots: saved }, true), saved)
})

test("save empty and copy requests contain no identity or role authority", () => {
  const { buildSaveRequest, buildCopyRequest } = require("../../../lib/weekly-menu/weekly-menu-presentation")
  assert.deepEqual(buildSaveRequest("2026-10-26", null, []), { week: "2026-10-26", slots: [] })
  assert.deepEqual(buildSaveRequest("2026-10-26", "opaque-ref", []), { week: "2026-10-26", target: "opaque-ref", slots: [] })
  assert.deepEqual(buildCopyRequest("2026-10-19", "2026-10-26", null), {
    sourceWeek: "2026-10-19", destinationWeek: "2026-10-26",
  })
  for (const payload of [buildSaveRequest("2026-10-26", null, []), buildCopyRequest("2026-10-19", "2026-10-26", null)]) {
    assert.equal("userId" in payload, false)
    assert.equal("role" in payload, false)
    assert.equal("ownerId" in payload, false)
  }
})

test("weekly UI uses only core APIs and SSR pages use cookies with Madrid canonicalization", () => {
  const component = fs.readFileSync(path.join(root, "components/weekly-menu-view.tsx"), "utf8")
  assert.doesNotMatch(component, /createClient|\.from\(["'](?:weekly_menus|menu_items)["']\)/)
  assert.match(component, /\/api\/weekly-menu/)
  assert.match(component, /method:\s*["']PUT["']/)
  assert.match(component, /method:\s*["']DELETE["']/)
  assert.match(component, /\/api\/weekly-menu\/copy/)
  assert.match(component, /onConfirm={emptyImmediately}/)
  assert.match(component, /method:\s*["']POST["']/)
  assert.doesNotMatch(component, /method:\s*["']PUT["'][\s\S]{0,300}\/copy/)

  const entry = fs.readFileSync(path.join(root, "app/weekly-menu/page.tsx"), "utf8")
  const dynamic = fs.readFileSync(path.join(root, "app/weekly-menu/[week]/page.tsx"), "utf8")
  assert.match(entry, /mondayIsoFor/)
  assert.match(dynamic, /cookies\(\)/)
  assert.match(dynamic, /auth\.getUser\(\)/)
  assert.match(dynamic, /normalizeWeekStart/)
  assert.doesNotMatch(dynamic, /useAuth|["']use client["']/)
})

test("admin targets remain opaque, recipe menu_ids and dashboard start_date contracts are preserved", () => {
  const component = fs.readFileSync(path.join(root, "components/weekly-menu-view.tsx"), "utf8")
  assert.match(component, /target\?\.ref/)
  assert.match(component, /target\.label|item\.label/)
  assert.doesNotMatch(component, /target\.(?:email|user_id|owner_id|full_name|avatar)/)

  const recipes = fs.readFileSync(path.join(root, "lib/recipes/recipe-server-operations.js"), "utf8")
  assert.match(recipes, /menu_items/)
  assert.match(recipes, /menu_ids/)
  const dashboard = fs.readFileSync(path.join(root, "components/dashboard/weekly-menu-preview.tsx"), "utf8")
  assert.match(dashboard, /start_date/)
  assert.doesNotMatch(dashboard, /week_start_date/)
})
