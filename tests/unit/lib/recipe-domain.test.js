const assert = require("node:assert/strict")
const test = require("node:test")

const {
  buildManagedRecipeImagePath,
  buildRecipeMutation,
  canManageRecipe,
  classifyImageTransition,
  normalizeCategoryName,
  parseCategoryId,
  parseRecipeId,
  toPublicRecipe,
  validateRating,
} = require("../../../lib/recipes/recipe-domain")

const HOY = new Date("2026-10-25T10:20:30.456Z")
const OWNER = "8f14e45f-ea6f-4f4a-9f5a-c7c11d5f6a21"

test("recipe and category ids accept only positive integers", () => {
  for (const value of [1, "2", 999]) {
    assert.equal(parseRecipeId(value), Number(value))
    assert.equal(parseCategoryId(value), Number(value))
  }
  for (const value of [null, undefined, "", "1x", 0, -1, 1.2, "1.2", Infinity]) {
    assert.equal(parseRecipeId(value), null)
    assert.equal(parseCategoryId(value), null)
  }
})

test("category normalization trims display names and compares case-insensitively", () => {
  assert.deepEqual(normalizeCategoryName("  Postres Caseros  "), {
    name: "Postres Caseros",
    comparisonKey: "postres caseros",
  })
  assert.equal(normalizeCategoryName("   "), null)
  assert.equal(normalizeCategoryName(null), null)
})

test("recipe mutation uses the actual allowlist, trusted actor and injected date", () => {
  assert.deepEqual(buildRecipeMutation({
    id: 999,
    name: "  Sopa ",
    ingredients: " agua ",
    preparation: null,
    image_url: " https://example.test/sopa.jpg ",
    is_ai_generated: 1,
    video_url: "",
    source_url: null,
    calories: "120",
    user_id: "attacker",
    created_at: "1999-01-01",
    updated_at: "1999-01-01",
    internal: true,
  }, OWNER, HOY), {
    name: "Sopa",
    ingredients: " agua ",
    preparation: "",
    is_ai_generated: true,
    video_url: null,
    source_url: null,
    calories: 120,
    user_id: OWNER,
    created_at: "2026-10-25T10:20:30.456Z",
  })
  assert.equal(Object.hasOwn(buildRecipeMutation({ name: "Sopa", image_url: "https://attacker.test/x" }, OWNER, HOY), "image_url"), false)
})

test("presentation management is limited to owner or admin", () => {
  assert.equal(canManageRecipe({ actorId: OWNER, actorRole: "user_full", ownerId: OWNER }), true)
  assert.equal(canManageRecipe({ actorId: "other", actorRole: "admin", ownerId: OWNER }), true)
  assert.equal(canManageRecipe({ actorId: "other", actorRole: "user_full", ownerId: OWNER }), false)
  assert.equal(canManageRecipe({ actorId: null, actorRole: "admin", ownerId: OWNER }), false)
})

test("ratings accept only integers from 1 to 5", () => {
  for (const value of [1, 2, 3, 4, 5]) assert.equal(validateRating(value), value)
  for (const value of [0, 6, 1.5, "5", null]) assert.equal(validateRating(value), null)
})

test("managed image paths stay under the recipe and use only hoy plus a safe filename", () => {
  assert.equal(buildManagedRecipeImagePath(12, " Mi foto (final).PNG ", HOY), "12/1792923630456-Mi-foto-final.PNG")
  for (const fileName of ["", "../foto.png", "folder/foto.png", String.raw`folder\foto.png`, "%2e%2e%2ffoto.png"]) {
    assert.throws(() => buildManagedRecipeImagePath(12, fileName, HOY), /invalid/i)
  }
  assert.throws(() => buildManagedRecipeImagePath("12x", "foto.png", HOY), /invalid/i)
})

test("image transitions report the active image and partial cleanup truthfully", () => {
  assert.deepEqual(classifyImageTransition("old", "new", { uploaded: false }), {
    status: "failed", active: "old", cleanupRequired: false,
  })
  assert.deepEqual(classifyImageTransition("old", "new", { uploaded: true, associated: false, newImageCleaned: false }), {
    status: "partial", active: "old", cleanupRequired: true,
  })
  assert.deepEqual(classifyImageTransition("old", "new", { uploaded: true, associated: true, previousImageCleaned: false }), {
    status: "partial", active: "new", cleanupRequired: true,
  })
  assert.deepEqual(classifyImageTransition("old", "new", { uploaded: true, associated: true, previousImageCleaned: true }), {
    status: "success", active: "new", cleanupRequired: false,
  })
})

test("public recipe DTO includes only public fields, categories, alias and aggregates", () => {
  const dto = toPublicRecipe({
    id: 7, name: "Sopa", ingredients: "Agua", preparation: "Hervir", image_url: null,
    is_ai_generated: false, created_at: "2026-01-01", video_url: null, source_url: null, calories: 100,
    categories: [{ id: 3, name: " Cena " }], author_alias: "  chef ", rating_average: "4.5", rating_count: "2",
    user_id: OWNER, profile_id: OWNER, email: "secret@example.test", full_name: "Private Name",
    first_name: "Private", last_name: "Name", phone: "600000000", avatar_url: "secret",
    user_profiles: { id: OWNER, email: "secret@example.test" },
  })
  assert.deepEqual(dto, {
    id: 7, name: "Sopa", ingredients: "Agua", preparation: "Hervir", image_url: null,
    is_ai_generated: false, created_at: "2026-01-01", video_url: null, source_url: null, calories: 100,
    categories: [{ id: 3, name: "Cena" }], author_alias: "chef", rating_average: 4.5, rating_count: 2,
  })
  const json = JSON.stringify(dto)
  for (const forbidden of ["user_id", "profile_id", "email", "full_name", "first_name", "last_name", "phone", "avatar_url", "user_profiles"]) {
    assert.equal(Object.hasOwn(dto, forbidden), false)
    assert.equal(json.includes(forbidden), false)
  }
  assert.equal(toPublicRecipe({ id: 1, name: "X", author_alias: "   " }).author_alias, "Usuario")
})
