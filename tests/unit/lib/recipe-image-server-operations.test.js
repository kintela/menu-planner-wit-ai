const assert = require("node:assert/strict")
const test = require("node:test")

const {
  MAX_RECIPE_IMAGE_FILE_BYTES,
  cleanupDeletedRecipeImage,
  deleteRecipeImage,
  replaceRecipeImage,
  validateRecipeImageFile,
} = require("../../../lib/recipes/recipe-image-server-operations")

const OWNER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const HOY = new Date("2026-10-25T10:20:30.456Z")
const NEW_PATH = `7/${HOY.getTime()}-dish.png`

function imageFile(overrides = {}) {
  return { name: "dish.png", type: "image/png", size: 128, ...overrides }
}

function fakeClient({
  actor = OWNER,
  role = "user_full",
  recipeOwner = OWNER,
  imageUrl = "https://external.test/old.jpg",
  managedPath = null,
  fail = {},
} = {}) {
  const state = {
    recipe: recipeOwner ? { id: 7, user_id: recipeOwner, image_url: imageUrl } : null,
    metadata: managedPath ? { recipe_id: 7, object_path: managedPath } : null,
    calls: [],
  }

  class Query {
    constructor(table) { this.table = table; this.action = "select"; this.payload = null; this.filters = {} }
    select(columns) { this.columns = columns; return this }
    update(payload) { this.action = "update"; this.payload = payload; return this }
    upsert(payload) { this.action = "upsert"; this.payload = payload; return this }
    delete() { this.action = "delete"; return this }
    eq(column, value) { this.filters[column] = value; return this }
    async maybeSingle() { return this.execute() }
    async single() { return this.execute() }
    then(resolve, reject) { return this.execute().then(resolve, reject) }
    async execute() {
      state.calls.push([this.table, this.action, this.payload, { ...this.filters }])
      const failureSetting = fail[`${this.table}:${this.action}`]
      const failure = Array.isArray(failureSetting) ? failureSetting.shift() : failureSetting
      if (failure) return { data: null, error: { message: "private persistence detail" } }
      if (this.table === "user_profiles") return { data: { role }, error: null }
      if (this.table === "recipes") {
        if (!state.recipe || Object.entries(this.filters).some(([key, value]) => state.recipe[key] !== value)) return { data: null, error: null }
        if (this.action === "update") Object.assign(state.recipe, this.payload)
        return { data: { ...state.recipe }, error: null }
      }
      if (this.table === "recipe_managed_images") {
        if (this.action === "upsert") state.metadata = { ...this.payload }
        else if (this.action === "delete" && state.metadata?.recipe_id === this.filters.recipe_id) state.metadata = null
        const matches = state.metadata && Object.entries(this.filters).every(([key, value]) => state.metadata[key] === value)
        return { data: matches ? { ...state.metadata } : null, error: null }
      }
      throw new Error(`unexpected table ${this.table}`)
    }
  }

  let removeIndex = 0
  const removeErrors = fail.remove || []
  return {
    state,
    client: {
      auth: { getUser: async () => ({ data: { user: actor ? { id: actor } : null }, error: actor ? null : { message: "no session" } }) },
      from: (table) => new Query(table),
      rpc: async (name, args) => {
        state.calls.push(["rpc", name])
        if (fail.authorization) return { data: null, error: { message: "private auth detail" } }
        if (name === "associate_recipe_image") {
          if (fail["recipe_managed_images:upsert"]) return { data: null, error: { message: "transition failed" } }
          const cleanup_path = state.metadata?.object_path || null
          state.recipe.image_url = args.p_image_url
          state.metadata = { recipe_id: 7, object_path: args.p_object_path }
          return { data: [{ active_url: args.p_image_url, cleanup_path }], error: null }
        }
        if (name === "clear_recipe_image") {
          if (fail["recipe_managed_images:delete"]) return { data: null, error: { message: "transition failed" } }
          const cleanup_path = state.metadata?.object_path || null
          state.recipe.image_url = null
          state.metadata = null
          return { data: [{ active_url: null, cleanup_path }], error: null }
        }
        if (name === "finalize_recipe_image_cleanup") return { data: !fail.finalize, error: fail.finalize ? { message: "finalize failed" } : null }
        return { data: role === "admin" || actor === recipeOwner, error: null }
      },
      storage: {
        from(bucket) {
          state.calls.push(["storage.from", bucket])
          return {
            async upload(path, file, options) {
              state.calls.push(["upload", path, file, options])
              return { data: fail.upload ? null : { path }, error: fail.upload ? { message: "private storage detail" } : null }
            },
            async remove(paths) {
              state.calls.push(["remove", paths])
              const error = removeErrors[removeIndex++] || null
              return { data: error ? null : paths, error }
            },
            getPublicUrl(path) {
              state.calls.push(["getPublicUrl", path])
              return { data: { publicUrl: `https://storage.test/recipe-images/${path}` } }
            },
          }
        },
      },
    },
  }
}

test("recipe images accept only one safe non-empty raster image up to 5 MB", () => {
  assert.deepEqual(validateRecipeImageFile(imageFile()), { ok: true, value: imageFile() })
  for (const file of [
    imageFile({ size: 0 }),
    imageFile({ size: MAX_RECIPE_IMAGE_FILE_BYTES + 1 }),
    imageFile({ type: "image/svg+xml" }),
    imageFile({ type: "application/pdf" }),
    imageFile({ name: "../dish.png" }),
  ]) assert.deepEqual(validateRecipeImageFile(file), { ok: false })
})

test("invalid ids, anonymous users and non-managers are rejected before storage", async () => {
  assert.equal((await replaceRecipeImage(fakeClient().client, "0", imageFile(), HOY)).status, 400)
  const anonymous = fakeClient({ actor: null })
  assert.equal((await replaceRecipeImage(anonymous.client, 7, imageFile(), HOY)).status, 401)
  const other = fakeClient({ actor: OTHER })
  assert.equal((await replaceRecipeImage(other.client, 7, imageFile(), HOY)).status, 403)
  assert.equal(other.state.calls.some(([name]) => name === "storage.from"), false)
  assert.equal((await replaceRecipeImage(fakeClient({ actor: OTHER, role: "admin" }).client, 7, imageFile(), HOY)).status, 200)
})

test("upload failure leaves old URL and accredited metadata untouched", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png", fail: { upload: true } })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_UPLOAD_FAILED")
  assert.equal(fixture.state.recipe.image_url, "https://external.test/old.jpg")
  assert.equal(fixture.state.metadata.object_path, "7/old.png")
  assert.equal(fixture.state.calls.some(([name]) => name === "remove"), false)
})

test("metadata association failure restores old URL and removes only the new object", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png", fail: { "recipe_managed_images:upsert": true } })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.status, 500)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_ASSOCIATION_FAILED")
  assert.equal(fixture.state.recipe.image_url, "https://external.test/old.jpg")
  assert.equal(fixture.state.metadata.object_path, "7/old.png")
  assert.deepEqual(fixture.state.calls.filter(([name]) => name === "remove"), [["remove", [NEW_PATH]]])
})

test("failed new-object compensation is reported without touching the accredited old object", async () => {
  const fixture = fakeClient({
    managedPath: "7/old.png",
    fail: { "recipe_managed_images:upsert": true, remove: [{ message: "failed" }] },
  })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.status, 207)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_ASSOCIATION_FAILED_CLEANUP_FAILED")
  assert.equal(fixture.state.recipe.image_url, "https://external.test/old.jpg")
  assert.deepEqual(fixture.state.calls.filter(([name]) => name === "remove"), [["remove", [NEW_PATH]]])
})

test("association transition failure is atomic and cleans only the uploaded object", async () => {
  const fixture = fakeClient({
    managedPath: "7/old.png",
    fail: { "recipe_managed_images:upsert": true },
  })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.status, 500)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_ASSOCIATION_FAILED")
  assert.equal(fixture.state.recipe.image_url, "https://external.test/old.jpg")
  assert.deepEqual(fixture.state.calls.filter(([name]) => name === "remove"), [["remove", [NEW_PATH]]])
})

test("successful replacement associates URL and metadata before old cleanup", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png" })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.status, 200)
  assert.equal(fixture.state.metadata.object_path, NEW_PATH)
  assert.equal(fixture.state.recipe.image_url, `https://storage.test/recipe-images/${NEW_PATH}`)
  const associateAt = fixture.state.calls.findIndex(([table, action]) => table === "rpc" && action === "associate_recipe_image")
  const removeAt = fixture.state.calls.findIndex(([name, paths]) => name === "remove" && paths[0] === "7/old.png")
  assert.ok(associateAt >= 0 && associateAt < removeAt)
})

test("old cleanup failure keeps new image active and reports a truthful partial", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png", fail: { remove: [{ message: "failed" }] } })
  const result = await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)
  assert.equal(result.status, 207)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_REPLACED_CLEANUP_FAILED")
  assert.equal(fixture.state.metadata.object_path, NEW_PATH)
})

test("external and unaccredited historical references are never deleted", async () => {
  for (const imageUrl of ["https://external.test/photo.jpg", "https://storage.test/recipe-images/99/foreign.png"]) {
    const fixture = fakeClient({ imageUrl, managedPath: null })
    assert.equal((await replaceRecipeImage(fixture.client, 7, imageFile(), HOY)).status, 200)
    assert.equal(fixture.state.calls.some(([name]) => name === "remove"), false)
  }
})

test("DELETE clears URL and metadata before deleting only the accredited object", async () => {
  const managed = fakeClient({ managedPath: "7/old.png" })
  assert.equal((await deleteRecipeImage(managed.client, 7)).status, 200)
  assert.equal(managed.state.recipe.image_url, null)
  assert.equal(managed.state.metadata, null)
  const clearAt = managed.state.calls.findIndex(([table, action]) => table === "rpc" && action === "clear_recipe_image")
  const removeAt = managed.state.calls.findIndex(([name]) => name === "remove")
  assert.ok(clearAt >= 0 && clearAt < removeAt)

  const external = fakeClient({ managedPath: null })
  assert.equal((await deleteRecipeImage(external.client, 7)).status, 200)
  assert.equal(external.state.recipe.image_url, null)
  assert.equal(external.state.calls.some(([name]) => name === "remove"), false)
})

test("DELETE cleanup failure leaves the reference removed and reports partial", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png", fail: { remove: [{ message: "failed" }] } })
  const result = await deleteRecipeImage(fixture.client, 7)
  assert.equal(result.status, 207)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_REMOVED_CLEANUP_FAILED")
  assert.equal(fixture.state.recipe.image_url, null)
  assert.equal(fixture.state.metadata, null)
})

test("DELETE metadata failure restores the old URL and does not touch storage", async () => {
  const fixture = fakeClient({ managedPath: "7/old.png", fail: { "recipe_managed_images:delete": true } })
  const result = await deleteRecipeImage(fixture.client, 7)
  assert.equal(result.status, 500)
  assert.equal(result.body.image.code, "RECIPE_IMAGE_DISASSOCIATION_FAILED")
  assert.equal(fixture.state.recipe.image_url, "https://external.test/old.jpg")
  assert.equal(fixture.state.metadata.object_path, "7/old.png")
  assert.equal(fixture.state.calls.some(([name]) => name === "remove"), false)
})

test("recipe deletion cleanup never restores a deleted recipe and reports residue", async () => {
  const fixture = fakeClient({ fail: { remove: [{ message: "failed" }] } })
  const result = await cleanupDeletedRecipeImage(fixture.client, {
    status: 200,
    body: { success: true },
    cleanupContext: { recipeId: 7, managedImagePath: "7/old.png" },
  })
  assert.equal(result.status, 207)
  assert.deepEqual(result.body, { success: false, partial: true, deleted: true, code: "RECIPE_DELETED_IMAGE_CLEANUP_FAILED" })
  assert.equal(fixture.state.calls.some(([table]) => table === "recipes"), false)

  const external = fakeClient()
  assert.equal((await cleanupDeletedRecipeImage(external.client, { status: 200, body: { success: true }, cleanupContext: { recipeId: 7, managedImagePath: null } })).status, 200)
  assert.equal(external.state.calls.some(([name]) => name === "remove"), false)
})
