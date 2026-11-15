const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const {
  createCategory,
  deleteCategory,
  mergeCategories,
  updateCategory,
} = require("../../../lib/recipes/recipe-server-operations")

const USER = "11111111-1111-4111-8111-111111111111"

function fakeClient({ actor = USER, role = "user_full", admin = role === "admin", fail = {} } = {}) {
  const state = {
    categories: [{ id: 1, name: "Cena", created_at: "2026-01-01" }, { id: 2, name: "Postres", created_at: "2026-01-02" }],
    calls: [],
  }

  class Query {
    constructor(table) { this.table = table; this.action = "select"; this.filters = {}; this.payload = null }
    select(columns) { this.columns = columns; return this }
    eq(column, value) { this.filters[column] = value; return this }
    order() { return this }
    insert(payload) { this.action = "insert"; this.payload = payload; return this }
    update(payload) { this.action = "update"; this.payload = payload; return this }
    delete() { this.action = "delete"; return this }
    single() { return this.execute(false) }
    maybeSingle() { return this.execute(true) }
    then(resolve, reject) { return this.execute(true).then(resolve, reject) }
    async execute(maybe) {
      state.calls.push([this.table, this.action, this.filters, this.payload])
      const failure = fail[`${this.table}:${this.action}`]
      if (failure) return { data: null, error: typeof failure === "object" ? failure : { message: "private SQL detail" } }
      if (this.table === "user_profiles") return { data: { role }, error: null }
      let rows = state.categories.filter((row) => Object.entries(this.filters).every(([key, value]) => row[key] === value))
      if (this.action === "insert") {
        const row = { id: 3, created_at: "2026-01-03", ...this.payload }
        state.categories.push(row); rows = [row]
      } else if (this.action === "update") {
        rows.forEach((row) => Object.assign(row, this.payload))
      } else if (this.action === "delete") {
        const selected = new Set(rows)
        state.categories = state.categories.filter((row) => !selected.has(row))
      }
      const projected = rows.map((row) => ({ ...row }))
      return { data: projected[0] || (maybe ? null : null), error: null }
    }
  }

  return {
    state,
    client: {
      auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: null }) },
      from: (table) => new Query(table),
      rpc: async (name, args) => {
        state.calls.push(["rpc", name, args])
        if (name === "current_user_is_admin") {
          if (fail.adminCheck) return { data: null, error: { message: "private SQL detail" } }
          return { data: admin, error: null }
        }
        if (name === "merge_categories") {
          if (fail.merge) return { data: null, error: typeof fail.merge === "object" ? fail.merge : { message: "private SQL detail" } }
          state.categories = state.categories.filter((category) => category.id !== args.p_source_category_id)
          return { data: args.p_target_category_id, error: null }
        }
        throw new Error(`unexpected RPC ${name}`)
      },
    },
  }
}

test("GET de categorías sigue siendo público y usa el cliente SSR de cookies", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/categories/route.ts"), "utf8")
  assert.match(source, /export async function GET/)
  assert.match(source, /createClient\(await cookies\(\)\)/)
})

test("crear exige sesión pero admite restricted, full y admin", async () => {
  assert.equal((await createCategory(fakeClient({ actor: null }).client, { name: "Nueva" })).status, 401)
  for (const role of ["user_restricted", "user_full", "admin"]) {
    const fixture = fakeClient({ role })
    const result = await createCategory(fixture.client, { name: "  Nueva  " })
    assert.equal(result.status, 201)
    assert.equal(result.body.category.name, "Nueva")
  }
})

test("nombre y cuerpos de categoría se validan estrictamente y duplicados son conflicto seguro", async () => {
  for (const body of [{}, { name: "   " }, { name: 3 }, { name: "X", id: 9 }]) {
    assert.equal((await createCategory(fakeClient().client, body)).status, 400)
  }
  const duplicate = await createCategory(fakeClient({ fail: { "categories:insert": { code: "23505", message: "registry secret" } } }).client, { name: " cena " })
  assert.deepEqual(duplicate, { status: 409, body: { error: "Ya existe una categoría con ese nombre" } })
  assert.equal(JSON.stringify(duplicate).includes("registry"), false)
})

test("solo admin puede editar o borrar y los IDs han de ser positivos", async () => {
  assert.equal((await updateCategory(fakeClient({ role: "user_full" }).client, 1, { name: "Otra" })).status, 403)
  assert.equal((await deleteCategory(fakeClient({ role: "user_restricted" }).client, 1)).status, 403)
  assert.equal((await updateCategory(fakeClient({ role: "admin" }).client, 0, { name: "Otra" })).status, 400)
  assert.equal((await deleteCategory(fakeClient({ role: "admin" }).client, "1x")).status, 400)

  const edited = await updateCategory(fakeClient({ role: "admin" }).client, 1, { name: "  Cenas  " })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.category.name, "Cenas")
})

test("borrado ocupado se bloquea y errores desconocidos fallan cerrados sin filtrar SQL", async () => {
  const occupied = await deleteCategory(fakeClient({ role: "admin", fail: { "categories:delete": { code: "23503", message: "recipe_categories secret" } } }).client, 1)
  assert.deepEqual(occupied, { status: 409, body: { error: "La categoría tiene recetas asociadas; vacíala o fusiónala antes de eliminarla" } })
  const failed = await deleteCategory(fakeClient({ role: "admin", fail: { "categories:delete": true } }).client, 1)
  assert.equal(failed.status, 500)
  assert.equal(JSON.stringify(failed).includes("private"), false)
})

test("merge exige admin, IDs distintos/existentes y una única RPC transaccional", async () => {
  assert.equal((await mergeCategories(fakeClient({ actor: null }).client, { source_category_id: 1, target_category_id: 2 })).status, 401)
  assert.equal((await mergeCategories(fakeClient().client, { source_category_id: 1, target_category_id: 2 })).status, 403)
  const admin = fakeClient({ role: "admin" })
  assert.equal((await mergeCategories(admin.client, { source_category_id: 1, target_category_id: 1 })).status, 400)
  assert.equal((await mergeCategories(admin.client, { source_category_id: -1, target_category_id: 2 })).status, 400)

  const missing = await mergeCategories(fakeClient({ role: "admin", fail: { merge: { code: "P0002", message: "private missing" } } }).client, { source_category_id: 9, target_category_id: 2 })
  assert.equal(missing.status, 404)
  const failed = await mergeCategories(fakeClient({ role: "admin", fail: { merge: true } }).client, { source_category_id: 1, target_category_id: 2 })
  assert.equal(failed.status, 500)

  const successFixture = fakeClient({ role: "admin" })
  const success = await mergeCategories(successFixture.client, { source_category_id: 1, target_category_id: 2 })
  assert.deepEqual(success, { status: 200, body: { success: true, target_category_id: 2 } })
  assert.deepEqual(successFixture.state.calls.filter((call) => call[0] === "rpc" && call[1] === "merge_categories"), [
    ["rpc", "merge_categories", { p_source_category_id: 1, p_target_category_id: 2 }],
  ])
})

test("rutas usan cookies y componentes no escriben categorías directamente desde Supabase", () => {
  const root = path.resolve(__dirname, "../../..")
  const routes = ["app/api/categories/route.ts", "app/api/categories/[id]/route.ts", "app/api/categories/merge/route.ts"]
  const routeSource = routes.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n")
  assert.match(routeSource, /createClient\(await cookies\(\)\)/)
  assert.doesNotMatch(routeSource, /SUPABASE_SERVICE_ROLE_KEY|x-user-id|authorization/i)
  for (const file of ["components/category-manager.tsx", "components/category-selector.tsx"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8")
    assert.doesNotMatch(source, /from\(["']categories["']\)\s*\.(insert|update|delete)/s)
    assert.match(source, /fetch\([`"']\/api\/categories/)
  }
})
