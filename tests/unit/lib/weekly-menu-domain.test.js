const assert = require("node:assert/strict")
const { execFileSync } = require("node:child_process")
const test = require("node:test")

const {
  WeeklyMenuDomainError,
  buildWeekRange,
  canEditWeek,
  canonicalizeMenuDraft,
  classifyWeek,
  copyMenuDraft,
  hasUnsavedChanges,
  mondayIsoFor,
  normalizeWeekStart,
  parseMadridDate,
  parseMenuSlot,
  restoreMenuDraft,
  validateMenuDraft,
} = require("../../../lib/weekly-menu/weekly-menu-domain")

const HOY = new Date("2026-10-25T23:30:00.000Z") // Monday 00:30 in Madrid

const slot = (day, meal = "comida", order = 1, recipe = day + 1, freezer = false) => ({
  day_of_week: day,
  meal_type: meal,
  dish_order: order,
  recipe_id: recipe,
  sacado_del_congelador: freezer,
})

test("civil dates are strict, including leap years, and independent of host timezone", () => {
  assert.deepEqual(parseMadridDate("2024-02-29"), { year: 2024, month: 2, day: 29, iso: "2024-02-29" })
  for (const value of ["2023-02-29", "2026-02-30", "2026-13-01", "2026-1-01", " 2026-01-01", null, new Date("2026-01-01T00:00:00Z")]) {
    assert.throws(() => parseMadridDate(value), error => error instanceof WeeklyMenuDomainError && error.code === "INVALID_CIVIL_DATE")
  }
})

test("Madrid instant produces the same Monday across Sunday, month/year and DST boundaries", () => {
  assert.equal(mondayIsoFor(HOY), "2026-10-26")
  assert.equal(mondayIsoFor(new Date("2026-12-31T23:30:00Z")), "2026-12-28")
  assert.equal(mondayIsoFor(new Date("2026-03-29T00:30:00Z")), "2026-03-23") // before spring jump
  assert.equal(mondayIsoFor(new Date("2026-03-29T22:30:00Z")), "2026-03-30") // Monday CEST
  assert.equal(mondayIsoFor(new Date("2026-10-25T00:30:00Z")), "2026-10-19") // before autumn rollback
  assert.equal(mondayIsoFor(new Date("2026-10-25T23:30:00Z")), "2026-10-26")
  assert.throws(() => mondayIsoFor(new Date("invalid")), error => error.code === "INVALID_TODAY")
})

test("Madrid week calculation does not depend on the process host timezone", () => {
  const modulePath = require.resolve("../../../lib/weekly-menu/weekly-menu-domain")
  const script = `process.stdout.write(require(${JSON.stringify(modulePath)}).mondayIsoFor(new Date("2026-03-29T22:30:00Z")))`
  const results = ["UTC", "America/Los_Angeles", "Asia/Tokyo"].map(TZ =>
    execFileSync(process.execPath, ["-e", script], { env: { ...process.env, TZ }, encoding: "utf8" })
  )
  assert.deepEqual(results, ["2026-03-30", "2026-03-30", "2026-03-30"])
})

test("week starts normalize to Monday and ranges always contain Monday through Sunday", () => {
  assert.equal(normalizeWeekStart("2026-01-01", HOY), "2025-12-29")
  assert.equal(normalizeWeekStart("2026-10-25", HOY), "2026-10-19")
  assert.deepEqual(buildWeekRange("2025-12-29", HOY), {
    monday: "2025-12-29",
    sunday: "2026-01-04",
    dates: ["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
    days: [
      { dayIndex: 0, iso: "2025-12-29" }, { dayIndex: 1, iso: "2025-12-30" },
      { dayIndex: 2, iso: "2025-12-31" }, { dayIndex: 3, iso: "2026-01-01" },
      { dayIndex: 4, iso: "2026-01-02" }, { dayIndex: 5, iso: "2026-01-03" },
      { dayIndex: 6, iso: "2026-01-04" },
    ],
  })
  assert.throws(() => buildWeekRange("2026-01-01", HOY), error => error.code === "NOT_MONDAY")
})

test("weeks are classified against the Madrid natural week", () => {
  assert.equal(classifyWeek("2026-10-19", HOY), "past")
  assert.equal(classifyWeek("2026-10-26", HOY), "current")
  assert.equal(classifyWeek("2026-11-02", HOY), "future")
})

test("occupied slots accept exactly the three combinations and exact fields", () => {
  assert.deepEqual(parseMenuSlot(slot(6, "cena", 1, 99, true)), slot(6, "cena", 1, 99, true))
  for (const invalid of [
    null, {}, slot(7), slot(-1), slot(0, "desayuno"), slot(0, "cena", 2), slot(0, "comida", 3),
    slot(0, "comida", 1, 0), slot(0, "comida", 1, 1.5), slot(0, "comida", 1, 1, null),
    { ...slot(0), id: 7 }, { ...slot(0), weekly_menu_id: 8 }, { ...slot(0), sacado_del_congelador: false, recipe_id: null },
  ]) assert.throws(() => parseMenuSlot(invalid), error => error.code === "INVALID_MENU_SLOT")
})

test("draft validation allows empty and exactly 21 unique slots, rejecting duplicates and overflow", () => {
  assert.deepEqual(validateMenuDraft([], HOY), [])
  const all = []
  for (let day = 0; day < 7; day += 1) all.push(slot(day, "comida", 1), slot(day, "comida", 2), slot(day, "cena", 1))
  assert.equal(validateMenuDraft(all, HOY).length, 21)
  assert.throws(() => validateMenuDraft([slot(0), slot(0, "comida", 1, 2)], HOY), error => error.code === "DUPLICATE_MENU_SLOT")
  assert.throws(() => validateMenuDraft([...all, slot(0)], HOY), error => error.code === "TOO_MANY_MENU_SLOTS")
})

test("canonical drafts sort stably, strip persistence/origin fields by rejection, and compare recipe plus freezer", () => {
  const saved = [slot(2, "cena", 1, 8, true), slot(0, "comida", 2, 4)]
  const reordered = [slot(0, "comida", 2, 4), slot(2, "cena", 1, 8, true)]
  assert.deepEqual(canonicalizeMenuDraft(saved, HOY), reordered)
  assert.equal(hasUnsavedChanges(saved, reordered, HOY), false)
  assert.equal(hasUnsavedChanges(saved, [slot(0, "comida", 2, 4), slot(2, "cena", 1, 8, false)], HOY), true)
  assert.equal(hasUnsavedChanges(saved, [slot(0, "comida", 2, 5), slot(2, "cena", 1, 8, true)], HOY), true)
})

test("copy changes only destination context and keeps source deeply unchanged", () => {
  const source = {
    weekStart: "2026-10-19",
    slots: [slot(0, "comida", 1, 12, true), slot(6, "cena", 1, 20)],
  }
  const original = structuredClone(source)
  const copied = copyMenuDraft(source, "2026-11-04", HOY)
  assert.deepEqual(copied, {
    weekStart: "2026-11-02",
    slots: [slot(0, "comida", 1, 12, true), slot(6, "cena", 1, 20)],
  })
  copied.slots[0].recipe_id = 999
  assert.deepEqual(source, original)
  assert.equal(JSON.stringify(copied).includes("2026-10-19"), false)
})

test("restore returns a canonical deep copy of the saved baseline", () => {
  const saved = [slot(4, "cena", 1, 4), slot(1, "comida", 1, 2, true)]
  const restored = restoreMenuDraft(saved, HOY)
  assert.deepEqual(restored, [slot(1, "comida", 1, 2, true), slot(4, "cena", 1, 4)])
  restored[0].recipe_id = 100
  assert.equal(saved[1].recipe_id, 2)
})

test("presentation edit permission requires authentication, ownership or admin, and non-past week", () => {
  const base = { actorId: "actor", actorRole: "user_full", ownerId: "actor", weekStart: "2026-10-26" }
  assert.equal(canEditWeek(base, HOY), true)
  assert.equal(canEditWeek({ ...base, actorId: "admin", actorRole: "admin", ownerId: "other" }, HOY), true)
  assert.equal(canEditWeek({ ...base, actorId: "other", ownerId: "owner" }, HOY), false)
  assert.equal(canEditWeek({ ...base, actorId: null, actorRole: "admin" }, HOY), false)
  assert.equal(canEditWeek({ ...base, weekStart: "2026-10-19", actorRole: "admin" }, HOY), false)
})
