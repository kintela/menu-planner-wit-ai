const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const {
  buildJsonRequest,
  imageResultActiveUrl,
  imageResultMessage,
  normalizeRecipeForPresentation,
  ratingResultMessage,
  categoryResultMessage,
  canCreateRecipe,
} = require("../../../lib/recipes/recipe-ui.js")

test("public presentation keeps menu_ids and uses only the safe author alias", () => {
  const recipe = normalizeRecipeForPresentation({
    id: 8,
    name: "Sopa",
    author_alias: "   ",
    menu_ids: [4, 9],
    user_id: "private-id",
    email: "private@example.test",
    full_name: "Private Name",
    avatar_url: "private.png",
  })

  assert.equal(recipe.author_alias, "Usuario")
  assert.deepEqual(recipe.menu_ids, [4, 9])
  for (const forbidden of ["user_id", "email", "full_name", "avatar_url", "profile_id"]) {
    assert.equal(Object.hasOwn(recipe, forbidden), false)
  }
})

test("request builders never add client identity or force deletion", () => {
  const request = buildJsonRequest("POST", {
    name: "Sopa",
    user_id: "forged",
    owner_id: "forged",
    force: true,
    categories: [1],
  })
  assert.equal(request.method, "POST")
  assert.deepEqual(request.headers, { "Content-Type": "application/json" })
  assert.equal("Authorization" in request.headers, false)
  assert.equal("x-user-id" in request.headers, false)
  assert.deepEqual(JSON.parse(request.body), { name: "Sopa", categories: [1] })

  const deletion = buildJsonRequest("DELETE")
  assert.equal(deletion.method, "DELETE")
  assert.equal(deletion.body, undefined)
})

test("all authenticated roles, including restricted, can create", () => {
  assert.equal(canCreateRecipe("user_restricted"), true)
  assert.equal(canCreateRecipe("user_full"), true)
  assert.equal(canCreateRecipe("admin"), true)
  assert.equal(canCreateRecipe(null), false)
})

test("image messages report active recipe and partial cleanup truthfully", () => {
  assert.match(imageResultMessage({ state: "active", code: "RECIPE_IMAGE_REPLACED" }), /actualizad/i)
  assert.match(imageResultMessage({ state: "active", code: "RECIPE_IMAGE_REPLACED_CLEANUP_PENDING" }), /activa.*limpieza.*pendiente/i)
  assert.match(imageResultMessage({ state: "failed", code: "RECIPE_IMAGE_ASSOCIATION_FAILED_CLEANUP_PENDING" }), /receta conserva.*residuo/i)
})

test("restore failure message reports the new active image and unknown outcomes stay conservative", () => {
  const partial = { state: "partial", code: "RECIPE_IMAGE_ASSOCIATION_FAILED_RESTORE_FAILED", active_url: "https://storage.test/new.png" }
  assert.match(imageResultMessage(partial), /imagen nueva.*activa/i)
  assert.equal(imageResultActiveUrl(partial), "https://storage.test/new.png")
  assert.match(imageResultMessage({ state: "partial", code: "UNKNOWN", active_url: "https://storage.test/new.png" }), /no se pudo determinar.*estado activo/i)
})

test("rating and category messages do not claim success for server failures", () => {
  assert.match(ratingResultMessage(false, { error: "No puedes valorar tu propia receta" }), /No puedes valorar/)
  assert.match(categoryResultMessage(false, { error: "Categoría ocupada" }), /Categoría ocupada/)
  assert.match(ratingResultMessage(true, { removed: true }), /retirad/i)
})

test("affected recipe writers do not use identity headers, force delete, generic upload or browser storage", () => {
  const files = [
    "components/add-recipe-form.tsx",
    "components/edit-recipe-form.tsx",
    "components/delete-recipe-button.tsx",
    "components/category-manager.tsx",
    "components/category-selector.tsx",
    "components/star-rating.tsx",
  ]
  const source = files.map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8")).join("\n")
  for (const forbidden of ["x-user-id", "?force=true", "/api/upload-image", ".storage.from(", "Authorization: Bearer"]) {
    assert.equal(source.includes(forbidden), false, forbidden)
  }
  const addForm = fs.readFileSync(path.join(process.cwd(), "components/add-recipe-form.tsx"), "utf8")
  const editForm = fs.readFileSync(path.join(process.cwd(), "components/edit-recipe-form.tsx"), "utf8")
  assert.doesNotMatch(addForm, /image_url\s*:/)
  assert.doesNotMatch(editForm.match(/const updateData = \{[\s\S]*?\n\s*\}/)?.[0] || "", /image_url/)
})

test("all active recipe creators use the protected endpoint without image, identity or force fields", () => {
  const creators = [
    "components/add-recipe-form.tsx",
    "components/ai-recipe-suggestion.tsx",
  ]

  for (const file of creators) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8")
    assert.match(source, /fetch\(["'`]\/api\/recipes["'`]/, `${file} must use POST /api/recipes`)
    assert.doesNotMatch(source, /\.from\(["']recipes["']\)\s*\n?\s*\.insert\(/, `${file} must not insert recipes from the browser`)
    assert.doesNotMatch(source, /\bimage_url\s*:/, `${file} must not send image_url during recipe creation`)
    assert.doesNotMatch(source, /\buser_id\s*:/, `${file} must not send user_id`)
    assert.doesNotMatch(source, /["']x-user-id["']\s*:|Authorization\s*:/i, `${file} must not send identity headers`)
    assert.doesNotMatch(source, /\bforce\s*:/, `${file} must not send force`)
  }
})

test("legacy recipe filtering consumes the public DTO without author identity or personal fallbacks", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../components/recipes-client-filter.tsx"), "utf8")
  assert.match(source, /PublicRecipe/)
  assert.match(source, /recipe\.is_owner === true/)
  assert.doesNotMatch(source, /user_id|creator|full_name|user\.email/)
})

test("recipe owner presentation accepts only the safe public alias", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../components/recipe-owner-info.tsx"), "utf8")
  assert.match(source, /authorAlias/)
  assert.doesNotMatch(source, /userId|user_profiles|full_name|email|avatar|createServerClient/)
})
