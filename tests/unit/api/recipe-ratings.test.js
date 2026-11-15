const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const operations = require("../../../lib/recipes/recipe-server-operations")

const OWNER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"

function fakeClient({ actor = null, owner = OWNER, admin = false, ratings = [], fail = {} } = {}) {
  const state = { ratings: ratings.map((row) => ({ ...row })), calls: [] }

  class Query {
    constructor(table) { this.table = table; this.action = "select"; this.filters = {}; this.payload = null }
    select(columns) { this.columns = columns; return this }
    eq(column, value) { this.filters[column] = value; return this }
    upsert(payload, options) { this.action = "upsert"; this.payload = payload; this.options = options; return this }
    delete() { this.action = "delete"; return this }
    single() { return this.execute(false) }
    maybeSingle() { return this.execute(true) }
    then(resolve, reject) { return this.execute(true).then(resolve, reject) }
    async execute(maybe) {
      state.calls.push([this.table, this.action, { ...this.filters }, this.payload, this.options])
      const failure = fail[`${this.table}:${this.action}`]
      if (failure) return { data: null, error: typeof failure === "object" ? failure : { message: "private SQL recipe_ratings user_id" } }
      if (this.table === "recipes") {
        // RLS only exposes this row to its owner (or an admin, not needed by this double).
        const row = (actor === owner || admin) && this.filters.id === 7 ? { id: 7, user_id: owner } : null
        return { data: row, error: null }
      }
      let rows = state.ratings.filter((row) => Object.entries(this.filters).every(([key, value]) => row[key] === value))
      if (this.action === "upsert") {
        const existing = state.ratings.find((row) => row.recipe_id === this.payload.recipe_id && row.user_id === this.payload.user_id)
        if (existing) Object.assign(existing, this.payload)
        else state.ratings.push({ id: state.ratings.length + 1, ...this.payload })
        rows = [existing || state.ratings.at(-1)]
      } else if (this.action === "delete") {
        const selected = new Set(rows)
        state.ratings = state.ratings.filter((row) => !selected.has(row))
      }
      return { data: this.action === "delete" ? rows : (rows[0] || (maybe ? null : null)), error: null }
    }
  }

  return {
    state,
    client: {
      auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: null }) },
      from: (table) => new Query(table),
      rpc: async (name, args) => {
        state.calls.push(["rpc", name, args])
        if (fail.rpc) return { data: null, error: { message: "private aggregate SQL" } }
        if (name !== "get_public_recipes") throw new Error(`unexpected RPC ${name}`)
        if (args.p_recipe_id !== 7 || owner === null) return { data: [], error: null }
        const current = state.ratings.filter((row) => row.recipe_id === 7)
        return { data: [{ id: 7, rating_average: current.length ? current.reduce((sum, row) => sum + row.rating, 0) / current.length : null, rating_count: current.length }], error: null }
      },
    },
  }
}

test("GET es público, devuelve estado cero y solo incluye la valoración propia con sesión", async () => {
  const zero = await operations.readRecipeRating(fakeClient().client, 7)
  assert.deepEqual(zero, { status: 200, body: { average: null, count: 0 } })

  const fixture = fakeClient({ actor: OTHER, ratings: [
    { id: 1, recipe_id: 7, user_id: OWNER, rating: 3 },
    { id: 2, recipe_id: 7, user_id: OTHER, rating: 5 },
  ] })
  const result = await operations.readRecipeRating(fixture.client, "7")
  assert.deepEqual(result, { status: 200, body: { average: 4, count: 2, own_rating: 5 } })
  assert.equal(JSON.stringify(result).includes(OWNER), false)
  assert.equal(JSON.stringify(result).includes(OTHER), false)
})

test("ID y cuerpo se validan estrictamente, incluidos decimales y fuera de rango", async () => {
  for (const id of [0, -1, "7x", 1.5]) {
    assert.equal((await operations.readRecipeRating(fakeClient().client, id)).status, 400)
  }
  for (const body of [{}, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { rating: "4" }, { rating: 4, user_id: OTHER }]) {
    assert.equal((await operations.upsertRecipeRating(fakeClient({ actor: OTHER }).client, 7, body)).status, 400)
  }
})

test("PUT exige sesión, rechaza owner incluso admin-owner antes de mutar y distingue inexistente", async () => {
  assert.equal((await operations.upsertRecipeRating(fakeClient().client, 7, { rating: 4 })).status, 401)
  for (const fixture of [fakeClient({ actor: OWNER }), fakeClient({ actor: OWNER, admin: true })]) {
    const result = await operations.upsertRecipeRating(fixture.client, 7, { rating: 4 })
    assert.equal(result.status, 403)
    assert.equal(fixture.state.calls.some((call) => call[0] === "recipe_ratings" && call[1] === "upsert"), false)
  }
  assert.equal((await operations.upsertRecipeRating(fakeClient({ actor: OTHER, owner: null }).client, 7, { rating: 4 })).status, 404)
})

test("otro usuario crea y actualiza mediante upsert único y el agregado se recalcula", async () => {
  const fixture = fakeClient({ actor: OTHER })
  const created = await operations.upsertRecipeRating(fixture.client, 7, { rating: 2 })
  assert.deepEqual(created, { status: 200, body: { success: true, rating: 2 } })
  const updated = await operations.upsertRecipeRating(fixture.client, 7, { rating: 5 })
  assert.equal(updated.status, 200)
  assert.equal(fixture.state.ratings.length, 1)
  assert.equal(fixture.state.ratings[0].rating, 5)
  assert.deepEqual((await operations.readRecipeRating(fixture.client, 7)).body, { average: 5, count: 1, own_rating: 5 })
  const upsertCall = fixture.state.calls.find((call) => call[0] === "recipe_ratings" && call[1] === "upsert")
  assert.deepEqual(upsertCall[4], { onConflict: "recipe_id,user_id" })

  const adminOther = await operations.upsertRecipeRating(fakeClient({ actor: OTHER, admin: true }).client, 7, { rating: 4 })
  assert.equal(adminOther.status, 200, "un admin no propietario valora como cualquier otro usuario")
})

test("DELETE retira solo la propia y es idempotente", async () => {
  const fixture = fakeClient({ actor: OTHER, ratings: [
    { id: 1, recipe_id: 7, user_id: OWNER, rating: 3 },
    { id: 2, recipe_id: 7, user_id: OTHER, rating: 5 },
  ] })
  assert.deepEqual(await operations.deleteRecipeRating(fixture.client, 7), { status: 200, body: { success: true, removed: true } })
  assert.deepEqual(fixture.state.ratings.map((row) => row.user_id), [OWNER])
  assert.deepEqual(await operations.deleteRecipeRating(fixture.client, 7), { status: 200, body: { success: true, removed: false } })
})

test("errores del proveedor se convierten en mensajes seguros sin SQL ni identidades", async () => {
  const aggregate = await operations.readRecipeRating(fakeClient({ fail: { rpc: true } }).client, 7)
  assert.deepEqual(aggregate, { status: 500, body: { error: "No se pudieron obtener las valoraciones" } })
  const write = await operations.upsertRecipeRating(fakeClient({ actor: OTHER, fail: { "recipe_ratings:upsert": true } }).client, 7, { rating: 4 })
  assert.deepEqual(write, { status: 500, body: { error: "No se pudo guardar la valoración" } })
  assert.doesNotMatch(JSON.stringify([aggregate, write]), /SQL|user_id|recipe_ratings/i)
})

test("la ruta usa SSR por cookies y no acepta service-role, bearer ni IDs de usuario", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/recipes/[id]/rating/route.ts"), "utf8")
  assert.match(source, /export async function GET/)
  assert.match(source, /export async function PUT/)
  assert.match(source, /export async function DELETE/)
  assert.match(source, /createClient\(await cookies\(\)\)/)
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|authorization|bearer|user_id|x-user-id/i)
})
