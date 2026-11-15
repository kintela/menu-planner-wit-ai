const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const {
  checkRecipeMenuUsage,
  createRecipe,
  deleteRecipe,
  updateRecipe,
} = require("../../../lib/recipes/recipe-server-operations")

const OWNER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"

function fakeClient({ actor = OWNER, role = "user_full", recipeOwner = OWNER, menuCount = 0, fail = {} } = {}) {
  const state = {
    recipes: recipeOwner ? [{ id: 7, name: "Anterior", ingredients: "a", preparation: "b", image_url: "https://external.test/a.jpg", is_ai_generated: false, created_at: "2020-01-01T00:00:00.000Z", video_url: null, source_url: null, calories: null, user_id: recipeOwner }] : [],
    categories: [{ id: 2 }, { id: 3 }],
    links: [{ recipe_id: 7, category_id: 2 }],
    menuItems: Array.from({ length: menuCount }, (_, id) => ({ id: id + 1, recipe_id: 7 })),
    managedImages: [{ recipe_id: 7, object_path: "7/managed.jpg" }],
    calls: [],
  }

  class Query {
    constructor(table) { this.table = table; this.filters = {}; this.action = "select"; this.payload = null; this.options = {} }
    select(columns, options = {}) { this.columns = columns; this.options = options; return this }
    eq(column, value) { this.filters[column] = value; return this }
    in(column, values) { this.inFilter = [column, values]; return this }
    insert(payload) { this.action = "insert"; this.payload = payload; return this }
    update(payload) { this.action = "update"; this.payload = payload; return this }
    delete() { this.action = "delete"; return this }
    order() { return this }
    single() { return this.execute(true) }
    maybeSingle() { return this.execute(true, true) }
    then(resolve, reject) { return this.execute().then(resolve, reject) }
    async execute(single = false, maybe = false) {
      state.calls.push([this.table, this.action, this.filters, this.payload])
      const failure = fail[`${this.table}:${this.action}`]
      if (failure) return { data: null, error: typeof failure === "object" ? failure : { message: "private sql detail" }, count: null }
      const key = { recipes: "recipes", categories: "categories", recipe_categories: "links", menu_items: "menuItems", recipe_managed_images: "managedImages", user_profiles: null }[this.table]
      if (this.table === "user_profiles") return { data: { role }, error: null }
      let rows = state[key].filter((row) => Object.entries(this.filters).every(([column, value]) => row[column] === value))
      if (this.inFilter) rows = rows.filter((row) => this.inFilter[1].includes(row[this.inFilter[0]]))
      if (this.action === "insert") {
        const values = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((row) => ({ ...row }))
        if (this.table === "recipes") values.forEach((row) => { row.id = 8 })
        state[key].push(...values); rows = values
      } else if (this.action === "update") {
        rows.forEach((row) => Object.assign(row, this.payload))
      } else if (this.action === "delete") {
        const selected = new Set(rows)
        state[key] = state[key].filter((row) => !selected.has(row))
      }
      if (this.options.count === "exact") return { data: this.options.head ? null : rows, error: null, count: rows.length }
      const resultRows = rows.map((row) => ({ ...row }))
      return { data: single ? (resultRows[0] || (maybe ? null : null)) : resultRows, error: null }
    }
  }

  return {
    state,
    client: {
      auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: null }) },
      from: (table) => new Query(table),
      rpc: async (name) => {
        state.calls.push(["rpc", name])
        if (fail.capability) return { data: null, error: { message: "private sql detail" } }
        if (name === "delete_recipe_with_image_cleanup") {
          if (menuCount > 0 || fail["recipes:delete"]?.code === "23503") return { data: null, error: { code: "23503" } }
          if (fail["recipes:delete"]) return { data: null, error: { message: "private sql detail" } }
          const cleanup_path = state.managedImages[0]?.object_path || null
          state.recipes = []
          state.managedImages = []
          return { data: [{ deleted: true, cleanup_path }], error: null }
        }
        return { data: role === "admin" || actor === recipeOwner, error: null }
      },
    },
  }
}

const validRecipe = { name: " Nueva ", ingredients: "i", preparation: "p", calories: 20, categories: [2, 2, 3] }

test("anonymous writes are rejected and restricted/full/admin users may create as themselves", async () => {
  assert.equal((await createRecipe(fakeClient({ actor: null }).client, validRecipe, new Date(0))).status, 401)
  for (const role of ["user_restricted", "user_full", "admin"]) {
    const fixture = fakeClient({ role })
    const result = await createRecipe(fixture.client, validRecipe, new Date(0))
    assert.equal(result.status, 201)
    assert.equal(fixture.state.recipes.at(-1).user_id, OWNER)
    assert.deepEqual(fixture.state.links.filter((link) => link.recipe_id === 8).map((link) => link.category_id), [2, 3])
  }
})

test("strict bodies reject spoofed/internal fields and invalid recipe/category ids", async () => {
  for (const extra of [{ user_id: OTHER }, { force: true }, { created_at: "x" }, { image_url: "https://example.test/x.jpg" }, { unexpected: 1 }]) {
    const result = await createRecipe(fakeClient().client, { ...validRecipe, ...extra }, new Date(0))
    assert.equal(result.status, 400)
    const update = await updateRecipe(fakeClient().client, 7, { ...validRecipe, ...extra }, new Date(0))
    assert.equal(update.status, 400)
  }
  assert.equal((await createRecipe(fakeClient().client, { ...validRecipe, categories: [0] }, new Date(0))).status, 400)
  assert.equal((await updateRecipe(fakeClient().client, "7x", validRecipe, new Date(0))).status, 400)
})

test("category validation and link failure compensate creation without false success", async () => {
  const missing = fakeClient()
  assert.equal((await createRecipe(missing.client, { ...validRecipe, categories: [999] }, new Date(0))).status, 400)
  assert.equal(missing.state.recipes.some((recipe) => recipe.id === 8), false)

  const failedLinks = fakeClient({ fail: { "recipe_categories:insert": true } })
  const result = await createRecipe(failedLinks.client, validRecipe, new Date(0))
  assert.equal(result.status, 500)
  assert.equal(result.body.success, undefined)
  assert.equal(failedLinks.state.recipes.some((recipe) => recipe.id === 8), false)
})

test("owner and admin can edit; another user is denied without mutation", async () => {
  for (const fixture of [fakeClient(), fakeClient({ actor: OTHER, role: "admin" })]) {
    assert.equal((await updateRecipe(fixture.client, 7, { ...validRecipe, name: "Editada" }, new Date(0))).status, 200)
    assert.equal(fixture.state.recipes[0].name, "Editada")
  }
  const denied = fakeClient({ actor: OTHER })
  assert.equal((await updateRecipe(denied.client, 7, validRecipe, new Date(0))).status, 403)
  assert.equal(denied.state.recipes[0].name, "Anterior")
})

test("failed edit associations report failure and restore recipe and old links when feasible", async () => {
  const fixture = fakeClient({ fail: { "recipe_categories:insert": true } })
  const result = await updateRecipe(fixture.client, 7, { ...validRecipe, name: "No debe quedar" }, new Date(0))
  assert.equal(result.status, 500)
  assert.equal(result.body.success, undefined)
  assert.equal(fixture.state.recipes[0].name, "Anterior")
  assert.deepEqual(fixture.state.links.filter((link) => link.recipe_id === 7).map((link) => link.category_id), [2])
  const recipeUpdates = fixture.state.calls.filter((call) => call[0] === "recipes" && call[1] === "update")
  assert.equal(recipeUpdates.every((call) => !Object.hasOwn(call[3], "image_url")), true)
})

test("menu usage blocks deletion, check errors fail closed, and no operation deletes menu_items", async () => {
  const used = fakeClient({ menuCount: 2 })
  assert.equal((await deleteRecipe(used.client, 7)).status, 409)
  assert.equal(used.state.recipes.length, 1)
  assert.equal(used.state.menuItems.length, 2)

  const checkFailure = fakeClient({ fail: { "menu_items:select": true } })
  assert.equal((await deleteRecipe(checkFailure.client, 7)).status, 500)
  assert.equal(checkFailure.state.recipes.length, 1)
  assert.equal(checkFailure.state.calls.some((call) => call[0] === "menu_items" && call[1] === "delete"), false)
})

test("owner/admin deletion captures managed metadata, denies others, and maps FK races to conflict", async () => {
  const owner = fakeClient()
  const deleted = await deleteRecipe(owner.client, 7)
  assert.equal(deleted.status, 200)
  assert.deepEqual(deleted.cleanupContext, { managedImagePath: "7/managed.jpg" })
  assert.equal(owner.state.managedImages.length, 0, "metadata cascades while private cleanup authorization survives")

  assert.equal((await deleteRecipe(fakeClient({ actor: OTHER }).client, 7)).status, 403)
  assert.equal((await deleteRecipe(fakeClient({ actor: OTHER, role: "admin" }).client, 7)).status, 200)
  const race = fakeClient({ fail: { "recipes:delete": { code: "23503", message: "private FK detail" } } })
  assert.equal((await deleteRecipe(race.client, 7)).status, 409)
})

test("protected menu check authenticates/manages and fails closed", async () => {
  assert.equal((await checkRecipeMenuUsage(fakeClient({ actor: null }).client, 7)).status, 401)
  assert.equal((await checkRecipeMenuUsage(fakeClient({ actor: OTHER }).client, 7)).status, 403)
  const used = await checkRecipeMenuUsage(fakeClient({ menuCount: 1 }).client, 7)
  assert.deepEqual({ status: used.status, inMenu: used.body.inMenu, menuCount: used.body.menuCount }, { status: 200, inMenu: true, menuCount: 1 })
  assert.equal((await checkRecipeMenuUsage(fakeClient({ fail: { "menu_items:select": true } }).client, 7)).status, 500)
})

test("write routes use the cookie SSR client and contain no privileged/header/menu-delete bypass", () => {
  const root = path.resolve(__dirname, "../../..")
  const routeFiles = [
    "app/api/recipes/route.ts",
    "app/api/recipes/[id]/route.ts",
    "app/api/recipes/[id]/check-menu-usage/route.ts",
  ]
  const source = routeFiles.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n")
  assert.match(source, /createClient\(await cookies\(\)\)/)
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|createClient\s*}\s*from\s*["']@supabase\/supabase-js|nodemailer|x-user-id|authorization/i)
  assert.doesNotMatch(source, /from\(["']menu_items["']\).*delete/s)
  assert.match(fs.readFileSync(path.join(root, "app/api/recipes/[id]/route.ts"), "utf8"), /searchParams\.has\(["']force["']\)/)
})

test("recipe GET uses session-aware detail capabilities for edit without exposing owner ids", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/recipes/[id]/route.ts"), "utf8")
  assert.match(source, /readRecipeDetail\(supabase, id\)/)
  assert.doesNotMatch(source, /user_id|profile_id/)
})
