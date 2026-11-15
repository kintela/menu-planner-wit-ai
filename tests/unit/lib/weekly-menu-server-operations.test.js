const assert = require("node:assert/strict")
const test = require("node:test")

const {
  copyWeeklyMenu,
  emptyWeeklyMenu,
  listWeeklyMenuAdminTargets,
  listWeeklyMenuSources,
  readWeeklyMenu,
  saveWeeklyMenu,
} = require("../../../lib/weekly-menu/weekly-menu-server-operations")

const ACTOR = "11111111-1111-4111-8111-111111111111"
const TARGET = "22222222-2222-4222-8222-222222222222"
const TODAY = new Date("2026-10-25T10:00:00Z")
const WEEK = "2026-10-19"
const FUTURE = "2026-10-26"
const occupied = {
  day_of_week: 0, meal_type: "comida", dish_order: 1,
  recipe_id: 7, sacado_del_congelador: false,
}

function fakeClient({ actor = ACTOR, admin = false, profile = true, role = "user_restricted", snapshot, recipes, fail = {} } = {}) {
  const calls = []
  const defaultSnapshot = [{
    menu_exists: false, is_saved: false, saved_at: null,
    target_ref: null, target_label: null, day_of_week: null,
    meal_type: null, dish_order: null, recipe_id: null,
    sacado_del_congelador: null,
  }]
  const publicRecipes = recipes || [
    { id: 7, name: "Propia", author_alias: "A", calories: 100 },
    { id: 8, name: "Ajena", author_alias: "B", calories: 200 },
  ]
  let currentSnapshot = snapshot || defaultSnapshot
  return {
    calls,
    client: {
      auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: null }) },
      async rpc(name, args) {
        calls.push([name, args])
        if (fail[name]) return { data: null, error: { code: fail[name], message: "private SQL detail" } }
        if (name === "weekly_menu_actor_is_authorized") {
          return { data: profile && ["user_restricted", "user_full", "admin"].includes(role), error: null }
        }
        if (name === "current_user_is_admin") return { data: admin, error: null }
        if (name === "get_weekly_menu_snapshot") return { data: currentSnapshot, error: null }
        if (name === "get_public_recipes") return { data: publicRecipes, error: null }
        if (name === "get_weekly_menu_sources") return { data: [
          { start_date: WEEK, end_date: "2026-10-25", source_label: "19/10/2026 – 25/10/2026" },
          { start_date: "2026-10-12", end_date: "2026-10-18", source_label: "12/10/2026 – 18/10/2026" },
        ], error: null }
        if (name === "get_weekly_menu_admin_targets") return { data: [
          { target_ref: TARGET, target_label: "Usuario · 22222222" },
          { target_ref: "33333333-3333-4333-8333-333333333333", target_label: "Usuario · 33333333" },
        ], error: null }
        if (name === "empty_weekly_menu") return { data: snapshot !== undefined, error: null }
        if (name === "save_weekly_menu") {
          currentSnapshot = args.p_slots.length ? args.p_slots.map((slot) => ({
            menu_exists: true, is_saved: true, saved_at: "2026-10-25T10:00:00Z",
            target_ref: args.p_target_ref, target_label: args.p_target_ref ? "Usuario · 22222222" : null,
            ...slot,
          })) : defaultSnapshot
          return { data: args.p_slots.length ? 44 : null, error: null }
        }
        throw new Error(`unexpected RPC ${name}`)
      },
    },
  }
}

test("requires auth.getUser before every read or save and performs no work without a session", async () => {
  for (const operation of [
    (client) => readWeeklyMenu(client, { week: WEEK }, TODAY),
    (client) => saveWeeklyMenu(client, { week: WEEK, slots: [] }, TODAY),
  ]) {
    const fixture = fakeClient({ actor: null })
    const result = await operation(fixture.client)
    assert.equal(result.status, 401)
    assert.deepEqual(fixture.calls, [])
  }
})

test("own operations require a current persisted profile with an explicitly allowed role", async () => {
  const operations = [
    (client) => readWeeklyMenu(client, { week: WEEK }, TODAY),
    (client) => saveWeeklyMenu(client, { week: FUTURE, slots: [] }, TODAY),
    (client) => emptyWeeklyMenu(client, { week: FUTURE }, TODAY),
    (client) => listWeeklyMenuSources(client, {}, TODAY),
    (client) => copyWeeklyMenu(client, { sourceWeek: WEEK, destinationWeek: FUTURE }, TODAY),
  ]

  for (const role of ["user_restricted", "user_full", "admin"]) {
    for (const operation of operations) {
      const fixture = fakeClient({ role })
      assert.notEqual((await operation(fixture.client)).status, 403, `allowed role ${role}`)
      assert.equal(fixture.calls[0][0], "weekly_menu_actor_is_authorized")
    }
  }

  for (const state of [
    { profile: false, role: "user_restricted", label: "missing profile" },
    { profile: true, role: null, label: "NULL role" },
    { profile: true, role: "other", label: "unsupported role" },
  ]) {
    for (const operation of operations) {
      const fixture = fakeClient(state)
      assert.deepEqual(await operation(fixture.client), {
        status: 403,
        body: { error: "No tienes permisos para realizar esta operación" },
      }, state.label)
      assert.deepEqual(fixture.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized"])
    }
  }
})

test("empty requires auth, strict input, an editable week and reports existing/absent without a snapshot", async () => {
  const anonymous = fakeClient({ actor: null })
  assert.equal((await emptyWeeklyMenu(anonymous.client, { week: FUTURE }, TODAY)).status, 401)
  assert.deepEqual(anonymous.calls, [])

  for (const [input, status] of [
    [{ week: "2026-10-12" }, 403],
    [{ week: "2026-10-27" }, 400],
    [{ week: FUTURE, target: null }, 400],
    [{ week: FUTURE, confirm: true }, 400],
  ]) {
    const fixture = fakeClient()
    assert.equal((await emptyWeeklyMenu(fixture.client, input, TODAY)).status, status)
    assert.deepEqual(fixture.calls, [])
  }

  const existing = fakeClient({ snapshot: [{ ...occupied }] })
  assert.deepEqual(await emptyWeeklyMenu(existing.client, { week: FUTURE }, TODAY), {
    status: 200, body: { success: true, removed: true, exists: false },
  })
  assert.deepEqual(existing.calls, [
    ["weekly_menu_actor_is_authorized", undefined],
    ["empty_weekly_menu", { p_start_date: FUTURE, p_target_ref: null }],
  ])

  const absent = fakeClient()
  assert.deepEqual((await emptyWeeklyMenu(absent.client, { week: FUTURE }, TODAY)).body,
    { success: true, removed: false, exists: false })
})

test("empty target authorization and RPC failures are uniform and never report success", async () => {
  const denied = fakeClient({ admin: false })
  assert.equal((await emptyWeeklyMenu(denied.client, { week: FUTURE, target: TARGET }, TODAY)).status, 403)
  assert.deepEqual(denied.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "current_user_is_admin"])

  const failed = fakeClient({ fail: { empty_weekly_menu: "private SQL detail" } })
  const result = await emptyWeeklyMenu(failed.client, { week: FUTURE }, TODAY)
  assert.equal(result.status, 500)
  assert.equal(result.body.success, undefined)
  assert.equal(JSON.stringify(result).includes("private"), false)
})

test("sources are authenticated, target-authorized and expose only saved week dates and labels", async () => {
  const anonymous = fakeClient({ actor: null })
  assert.equal((await listWeeklyMenuSources(anonymous.client, {}, TODAY)).status, 401)
  assert.deepEqual(anonymous.calls, [])

  const own = fakeClient()
  const ownResult = await listWeeklyMenuSources(own.client, {}, TODAY)
  assert.equal(ownResult.status, 200)
  assert.deepEqual(own.calls, [
    ["weekly_menu_actor_is_authorized", undefined],
    ["get_weekly_menu_sources", { p_target_ref: null }],
  ])
  assert.deepEqual(Object.keys(ownResult.body.sources[0]).sort(), ["end_date", "label", "start_date"])
  assert.equal(JSON.stringify(ownResult.body).includes("id"), false)

  const admin = fakeClient({ admin: true })
  assert.equal((await listWeeklyMenuSources(admin.client, { target: TARGET }, TODAY)).status, 200)
  assert.deepEqual(admin.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "current_user_is_admin", "get_weekly_menu_sources"])

  for (const input of [{ target: null }, { target: TARGET, history: true }, { target: "bad" }]) {
    const invalid = fakeClient()
    assert.equal((await listWeeklyMenuSources(invalid.client, input, TODAY)).status, 400)
    assert.deepEqual(invalid.calls, [])
  }
})

test("copy reads an accessible saved source and returns an unwritten 21-slot destination draft", async () => {
  const sourceRows = [{
    menu_exists: true, is_saved: true, saved_at: "2026-10-20T10:00:00Z",
    target_ref: null, target_label: null, ...occupied,
  }]
  const fixture = fakeClient({ snapshot: sourceRows })
  const result = await copyWeeklyMenu(fixture.client, {
    sourceWeek: WEEK, destinationWeek: FUTURE,
  }, TODAY)
  assert.equal(result.status, 200)
  assert.equal(result.body.draft.week.start_date, FUTURE)
  assert.equal(result.body.draft.week.classification, "future")
  assert.equal(result.body.draft.slots.length, 21)
  assert.equal(result.body.draft.slots.filter(slot => slot.occupied).length, 1)
  assert.equal(result.body.draft.slots[0].recipe.name, "Propia")
  assert.deepEqual(result.body.draft.saved_snapshot, [occupied])
  assert.deepEqual(fixture.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "get_weekly_menu_snapshot", "get_public_recipes"])
  assert.equal(fixture.calls.some(([name]) => name === "save_weekly_menu" || name === "empty_weekly_menu"), false)
  assert.deepEqual(sourceRows[0], {
    menu_exists: true, is_saved: true, saved_at: "2026-10-20T10:00:00Z",
    target_ref: null, target_label: null, ...occupied,
  })
})

test("copy denies past destinations, malformed input and absent/unsaved sources without writing", async () => {
  for (const [input, status] of [
    [{ sourceWeek: WEEK, destinationWeek: "2026-10-12" }, 403],
    [{ sourceWeek: "2026-10-20", destinationWeek: FUTURE }, 400],
    [{ sourceWeek: WEEK, destinationWeek: FUTURE, target: null }, 400],
    [{ sourceWeek: WEEK, destinationWeek: FUTURE, owner_id: ACTOR }, 400],
  ]) {
    const fixture = fakeClient()
    assert.equal((await copyWeeklyMenu(fixture.client, input, TODAY)).status, status)
    assert.deepEqual(fixture.calls, [])
  }

  for (const snapshot of [undefined, [{
    menu_exists: true, is_saved: false, saved_at: null, target_ref: null, target_label: null,
    day_of_week: null, meal_type: null, dish_order: null, recipe_id: null, sacado_del_congelador: null,
  }]]) {
    const fixture = fakeClient({ snapshot })
    const result = await copyWeeklyMenu(fixture.client, { sourceWeek: WEEK, destinationWeek: FUTURE }, TODAY)
    assert.deepEqual(result, { status: 404, body: { error: "El menú de origen no está disponible" } })
    assert.equal(fixture.calls.some(([name]) => name === "save_weekly_menu"), false)
  }
})

test("copy supports a saved empty source and target denial does not enumerate its existence", async () => {
  const emptySaved = [{
    menu_exists: true, is_saved: true, saved_at: "2026-10-20T10:00:00Z",
    target_ref: null, target_label: null, day_of_week: null, meal_type: null,
    dish_order: null, recipe_id: null, sacado_del_congelador: null,
  }]
  const copied = await copyWeeklyMenu(fakeClient({ snapshot: emptySaved }).client,
    { sourceWeek: WEEK, destinationWeek: FUTURE }, TODAY)
  assert.equal(copied.status, 200)
  assert.equal(copied.body.draft.slots.every(slot => !slot.occupied), true)

  const denied = fakeClient({ admin: false, snapshot: emptySaved })
  const result = await copyWeeklyMenu(denied.client,
    { sourceWeek: WEEK, destinationWeek: FUTURE, target: TARGET }, TODAY)
  assert.deepEqual(result, { status: 403, body: { error: "No tienes permisos para realizar esta operación" } })
  assert.deepEqual(denied.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "current_user_is_admin"])
})

test("admin targets are admin-only and expose distinguishable opaque refs plus safe labels", async () => {
  const anonymous = fakeClient({ actor: null })
  assert.equal((await listWeeklyMenuAdminTargets(anonymous.client)).status, 401)

  const denied = fakeClient({ admin: false })
  assert.deepEqual(await listWeeklyMenuAdminTargets(denied.client), {
    status: 403, body: { error: "No tienes permisos para realizar esta operación" },
  })
  assert.deepEqual(denied.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "current_user_is_admin"])

  const allowed = fakeClient({ admin: true })
  const result = await listWeeklyMenuAdminTargets(allowed.client)
  assert.equal(result.status, 200)
  assert.deepEqual(allowed.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "current_user_is_admin", "get_weekly_menu_admin_targets"])
  assert.deepEqual(Object.keys(result.body.targets[0]).sort(), ["label", "ref"])
  assert.notEqual(result.body.targets[0].label, result.body.targets[1].label)
  const serialized = JSON.stringify(result.body)
  for (const forbidden of ["email", "avatar", "full_name", "user_id", ACTOR]) assert.equal(serialized.includes(forbidden), false)
})

test("own menu is available to every authenticated role without trusting a client role", async () => {
  for (const role of ["user_restricted", "user_full", "admin"]) {
    const fixture = fakeClient()
    const result = await readWeeklyMenu(fixture.client, { week: WEEK, role }, TODAY)
    assert.equal(result.status, 400, "spoofed role is rejected as an unknown field")
  }
  const fixture = fakeClient()
  assert.equal((await readWeeklyMenu(fixture.client, { week: WEEK }, TODAY)).status, 200)
  assert.equal(fixture.calls.some(([name]) => name === "current_user_is_admin"), false)
})

test("returns a safe 21-slot DTO and public recipes for empty and occupied snapshots", async () => {
  const snapshot = [{
    menu_exists: true, is_saved: true, saved_at: "2026-10-20T10:00:00Z",
    target_ref: null, target_label: null, ...occupied,
  }, {
    menu_exists: true, is_saved: true, saved_at: "2026-10-20T10:00:00Z",
    target_ref: null, target_label: null, ...occupied,
    day_of_week: 2, meal_type: "cena", recipe_id: 8,
    sacado_del_congelador: true,
  }]
  const result = await readWeeklyMenu(fakeClient({ snapshot }).client, { week: WEEK }, TODAY)
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.week, {
    start_date: WEEK, end_date: "2026-10-25",
    dates: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"],
    classification: "current",
  })
  assert.equal(result.body.exists, true)
  assert.equal(result.body.editable, true)
  assert.equal(result.body.slots.length, 21)
  assert.equal(result.body.slots.filter((slot) => slot.occupied).length, 2)
  assert.equal(result.body.slots.find((slot) => slot.day_of_week === 2 && slot.meal_type === "cena").recipe.name, "Ajena")
  assert.deepEqual(result.body.saved_snapshot, [occupied, { ...occupied, day_of_week: 2, meal_type: "cena", recipe_id: 8, sacado_del_congelador: true }])
  const serialized = JSON.stringify(result.body)
  assert.equal(serialized.includes(ACTOR), false)
  assert.equal(serialized.includes("user_id"), false)
})

test("past weeks remain readable but are classified non-editable", async () => {
  const result = await readWeeklyMenu(fakeClient().client, { week: "2026-10-12" }, TODAY)
  assert.equal(result.status, 200)
  assert.equal(result.body.week.classification, "past")
  assert.equal(result.body.editable, false)
})

test("admin target requires capability and exposes only its opaque ref and safe label", async () => {
  const snapshot = [{
    menu_exists: false, is_saved: false, saved_at: null,
    target_ref: TARGET, target_label: "Usuario · 22222222",
    day_of_week: null, meal_type: null, dish_order: null,
    recipe_id: null, sacado_del_congelador: null,
  }]
  const allowed = await readWeeklyMenu(fakeClient({ admin: true, snapshot }).client, { week: WEEK, target: TARGET }, TODAY)
  assert.equal(allowed.status, 200)
  assert.deepEqual(allowed.body.target, { ref: TARGET, label: "Usuario · 22222222" })
  assert.equal(JSON.stringify(allowed.body).includes(ACTOR), false)

  const denied = fakeClient({ admin: false })
  const deniedResult = await readWeeklyMenu(denied.client, { week: WEEK, target: TARGET }, TODAY)
  assert.deepEqual(deniedResult, { status: 403, body: { error: "No tienes permisos para realizar esta operación" } })
  assert.equal(denied.calls.some(([name]) => name === "get_weekly_menu_snapshot"), false)
})

test("strict input rejects invalid/non-Monday weeks, opaque targets and spoof fields", async () => {
  for (const input of [
    { week: "2026-10-20" }, { week: "2026-02-30" }, { week: WEEK, target: "not-uuid" },
    { week: WEEK, user_id: ACTOR }, { week: WEEK, actorRole: "admin" },
  ]) assert.equal((await readWeeklyMenu(fakeClient().client, input, TODAY)).status, 400)

  for (const input of [
    { week: FUTURE, slots: [], user_id: ACTOR },
    { week: FUTURE, slots: [], role: "admin" },
    { week: FUTURE, target: null, slots: [] },
    { week: FUTURE, slots: [], unexpected: true },
  ]) assert.equal((await saveWeeklyMenu(fakeClient().client, input, TODAY)).status, 400)
})

test("save accepts own or other public recipes, calls only atomic RPC, then re-reads", async () => {
  for (const recipe_id of [7, 8]) {
    const fixture = fakeClient()
    const result = await saveWeeklyMenu(fixture.client, { week: FUTURE, slots: [{ ...occupied, recipe_id }] }, TODAY)
    assert.equal(result.status, 200)
    assert.deepEqual(fixture.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "save_weekly_menu", "get_weekly_menu_snapshot", "get_public_recipes"])
    assert.equal(result.body.success, true)
    assert.equal(result.body.menu.saved_snapshot[0].recipe_id, recipe_id)
  }
})

test("empty save is an atomic delete/no-op and past or malformed drafts never call persistence", async () => {
  const empty = fakeClient()
  assert.equal((await saveWeeklyMenu(empty.client, { week: FUTURE, slots: [] }, TODAY)).status, 200)
  assert.deepEqual(empty.calls[1], ["save_weekly_menu", { p_start_date: FUTURE, p_slots: [], p_target_ref: null }])

  for (const input of [
    { week: "2026-10-12", slots: [] },
    { week: FUTURE, slots: [{ ...occupied, owner_id: ACTOR }] },
    { week: FUTURE, slots: [{ ...occupied }, { ...occupied, recipe_id: 8 }] },
  ]) {
    const fixture = fakeClient()
    assert.equal((await saveWeeklyMenu(fixture.client, input, TODAY)).status, input.week < WEEK ? 403 : 400)
    assert.deepEqual(fixture.calls, [])
  }
})

test("RPC failures are generic, do not enumerate targets or recipes, and never report partial success", async () => {
  for (const failure of ["WM_FORBIDDEN", "WM_RECIPE_UNAVAILABLE", "private constraint name"]) {
    const fixture = fakeClient({ fail: { save_weekly_menu: failure } })
    const result = await saveWeeklyMenu(fixture.client, { week: FUTURE, slots: [occupied] }, TODAY)
    assert.equal(result.status, failure === "WM_FORBIDDEN" ? 403 : failure === "WM_RECIPE_UNAVAILABLE" ? 400 : 500)
    assert.equal(result.body.success, undefined)
    assert.equal(JSON.stringify(result).includes("private"), false)
    assert.deepEqual(fixture.calls.map(([name]) => name), ["weekly_menu_actor_is_authorized", "save_weekly_menu"],
      "a failed save is not re-read as success")
  }
})
