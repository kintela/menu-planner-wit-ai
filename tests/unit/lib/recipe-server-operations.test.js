const assert = require("node:assert/strict")
const test = require("node:test")

const {
  readPublicCategories,
  readPublicRecipe,
  readPublicRecipes,
  readRecipeDetail,
  readRecipeListing,
} = require("../../../lib/recipes/recipe-server-operations")

const USER_ID = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"

function rpcClient(rows, error = null) {
  const calls = []
  return {
    calls,
    client: {
      rpc(name, args) {
        calls.push(["rpc", name, args])
        return Promise.resolve({ data: rows, error })
      },
    },
  }
}

test("public list and detail use only the safe get_public_recipes RPC", async () => {
  const row = { id: 2, name: "Sopa", author_alias: null, categories: [], rating_count: 0 }
  const list = rpcClient([row])
  assert.deepEqual(await readPublicRecipes(list.client), { status: 200, body: { recipes: [{
    id: 2, name: "Sopa", ingredients: "", preparation: "", image_url: null, is_ai_generated: false,
    created_at: null, video_url: null, source_url: null, calories: null, categories: [], author_alias: "Usuario",
    rating_average: null, rating_count: 0,
  }] } })
  assert.deepEqual(list.calls, [["rpc", "get_public_recipes", { p_recipe_id: null }]])

  const detail = rpcClient([row])
  assert.equal((await readPublicRecipe(detail.client, "2")).body.recipe.author_alias, "Usuario")
  assert.deepEqual(detail.calls, [["rpc", "get_public_recipes", { p_recipe_id: 2 }]])
  assert.deepEqual(await readPublicRecipe(detail.client, "2x"), { status: 400, body: { error: "ID de receta inválido" } })
})

test("public reads return not found and generic persistence errors", async () => {
  assert.deepEqual(await readPublicRecipe(rpcClient([]).client, 3), { status: 404, body: { error: "Receta no encontrada" } })
  assert.deepEqual(await readPublicRecipes(rpcClient(null, { message: "private database detail" }).client), {
    status: 500, body: { error: "No se pudieron obtener las recetas" },
  })
})

test("public categories select only public columns and expose authoritative recipe counts without service role", async () => {
  const calls = []
  const client = {
    from(table) {
      calls.push(["from", table])
      if (table === "categories") return {
        select(columns) { calls.push(["select", table, columns]); return this },
        order(column) { calls.push(["order", table, column]); return Promise.resolve({ data: [{ id: 1, name: "Cena", created_at: "x" }, { id: 2, name: "Postres", created_at: "y" }], error: null }) },
      }
      if (table === "recipe_categories") return {
        select(columns) { calls.push(["select", table, columns]); return Promise.resolve({ data: [{ category_id: 1 }, { category_id: 1 }], error: null }) },
      }
      throw new Error(`unexpected table ${table}`)
    },
  }
  assert.deepEqual(await readPublicCategories(client), { status: 200, body: { categories: [
    { id: 1, name: "Cena", created_at: "x", recipe_count: 2 },
    { id: 2, name: "Postres", created_at: "y", recipe_count: 0 },
  ] } })
  assert.deepEqual(calls, [
    ["from", "categories"], ["select", "categories", "id, name, created_at"], ["order", "categories", "name"],
    ["from", "recipe_categories"], ["select", "recipe_categories", "category_id"],
  ])
})

test("anonymous listing performs no capability/menu queries and leaks no ids", async () => {
  const calls = []
  const client = {
    rpc(name, args) { calls.push(["rpc", name, args]); return Promise.resolve({ data: [{ id: 4, name: "Arroz", author_alias: "A" }], error: null }) },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    from(table) { calls.push(["from", table]); throw new Error("anonymous extra query") },
  }
  const result = await readRecipeListing(client)
  assert.equal(result.status, 200)
  assert.deepEqual(calls, [["rpc", "get_public_recipes", { p_recipe_id: null }]])
  assert.deepEqual(result.body.recipes[0].menu_ids, [])
  assert.equal(JSON.stringify(result).includes(USER_ID), false)
})

test("authenticated listing adds only capabilities, own rating and exact menu mapping", async () => {
  const calls = []
  const responses = {
    recipes: [{ id: 2 }, { id: 3 }],
    own_recipes: [{ id: 2 }],
    recipe_ratings: [{ recipe_id: 3, rating: 5 }],
    menu_items: [{ recipe_id: 2, weekly_menu_id: 10 }, { recipe_id: 2, weekly_menu_id: 11 }],
  }
  function query(table) {
    let own = false
    return {
      select(columns) { calls.push(["select", table, columns]); return this },
      eq(column, value) {
        calls.push(["eq", table, column, value])
        if (table === "recipes" && column === "user_id") own = true
        return this
      },
      then(resolve) { resolve({ data: own ? responses.own_recipes : responses[table], error: null }) },
    }
  }
  const client = {
    rpc: async () => ({ data: [{ id: 2, name: "A" }, { id: 3, name: "B" }], error: null }),
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
    from(table) { calls.push(["from", table]); return query(table) },
  }
  const result = await readRecipeListing(client)
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.recipes.map(({ id, can_edit, can_delete, is_owner, my_rating, menu_ids }) => ({ id, can_edit, can_delete, is_owner, my_rating, menu_ids })), [
    { id: 2, can_edit: true, can_delete: true, is_owner: true, my_rating: null, menu_ids: [10, 11] },
    { id: 3, can_edit: true, can_delete: true, is_owner: false, my_rating: 5, menu_ids: [] },
  ])
  const json = JSON.stringify(result.body)
  assert.equal(json.includes(USER_ID), false)
  assert.equal(json.includes("user_id"), false)
  assert.ok(calls.some((call) => call[0] === "select" && call[1] === "recipes" && call[2] === "id"))
})

test("authenticated detail exposes booleans and own rating but no identity", async () => {
  const calls = []
  const client = {
    rpc: async () => ({ data: [{ id: 8, name: "Pan", author_alias: "P" }], error: null }),
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
    from(table) {
      calls.push(["from", table])
      const query = {
        select() { return this }, eq() { return this },
        maybeSingle: async () => ({ data: table === "recipes" ? { id: 8 } : { rating: 4 }, error: null }),
      }
      return query
    },
  }
  const result = await readRecipeDetail(client, 8)
  assert.deepEqual({ can_edit: result.body.recipe.can_edit, can_delete: result.body.recipe.can_delete, is_owner: result.body.recipe.is_owner, my_rating: result.body.recipe.my_rating }, {
    can_edit: true, can_delete: true, is_owner: true, my_rating: 4,
  })
  assert.equal(JSON.stringify(result.body).includes(USER_ID), false)
  assert.deepEqual(calls, [["from", "recipes"], ["from", "recipes"], ["from", "recipe_ratings"]])
})

test("admin author filters keep duplicate aliases and Usuario fallbacks distinct without exposing ids", async () => {
  const owners = ["owner-a", "owner-b", "owner-c", "owner-d"]
  const publicRows = [
    { id: 1, name: "A", author_alias: "Igual" },
    { id: 2, name: "B", author_alias: "Igual" },
    { id: 3, name: "C", author_alias: null },
    { id: 4, name: "D", author_alias: "" },
  ]
  let recipeQuery = 0
  const client = {
    rpc: async (name) => name === "current_user_is_admin" ? { data: true, error: null } : { data: publicRows, error: null },
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
    from(table) {
      const index = table === "recipes" ? recipeQuery++ : -1
      return {
        select() { return this }, eq() { return this },
        then(resolve) {
          const data = table === "recipes" ? (index === 0 ? publicRows.map((row, i) => ({ id: row.id, user_id: owners[i] })) : []) : []
          resolve({ data, error: null })
        },
      }
    },
  }
  const result = await readRecipeListing(client)
  assert.equal(new Set(result.body.recipes.map((recipe) => recipe.author_filter_key)).size, 4)
  assert.deepEqual(result.body.recipes.map((recipe) => recipe.author_filter_label), ["Igual (1)", "Igual (2)", "Usuario (1)", "Usuario (2)"])
  const serialized = JSON.stringify(result.body)
  for (const owner of owners) assert.equal(serialized.includes(owner), false)
  assert.equal(serialized.includes("user_id"), false)
})
